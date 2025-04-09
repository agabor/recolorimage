#!/bin/bash

# Script to use Claude Code to read an issue, solve it, and create a pull request
# Usage: ./claude-github-solver.sh ISSUE_NUMBER

set -e

if [ -z "$1" ]; then
  echo "Please provide an issue number"
  echo "Usage: $0 ISSUE_NUMBER"
  exit 1
fi

ISSUE_NUMBER=$1
BRANCH_NAME="fix-issue-$ISSUE_NUMBER"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "GitHub CLI (gh) is not installed. Please install it first:"
  echo "https://cli.github.com/manual/installation"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. Please install it first."
  echo "For macOS: brew install jq"
  echo "For Ubuntu/Debian: sudo apt-get install jq"
  echo "For Fedora: sudo dnf install jq"
  exit 1
fi

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
  echo "Claude Code CLI is not installed. Please install it first."
  echo "Visit https://anthropic.com to learn more about Claude Code."
  exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
  echo "Please authenticate with GitHub first using: gh auth login"
  exit 1
fi

# Get current repository information
REPO_INFO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
if [ -z "$REPO_INFO" ]; then
  echo "Failed to get repository information. Make sure you're in a git repository."
  exit 1
fi

echo "Working with repository: $REPO_INFO"

# Get issue details
echo "Fetching issue #$ISSUE_NUMBER..."
ISSUE_DATA=$(gh issue view "$ISSUE_NUMBER" --json title,body,labels)
ISSUE_TITLE=$(echo "$ISSUE_DATA" | jq -r '.title')
ISSUE_BODY=$(echo "$ISSUE_DATA" | jq -r '.body')
ISSUE_LABELS=$(echo "$ISSUE_DATA" | jq -r '.labels[].name')

echo "Issue title: $ISSUE_TITLE"
echo "Issue description:"
echo "$ISSUE_BODY" | head -n 10
if [ $(echo "$ISSUE_BODY" | wc -l) -gt 10 ]; then
  echo "... (description truncated, see full issue for details)"
fi

echo "Issue labels: $ISSUE_LABELS"

# Create a new branch
echo "Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Create a temporary file with the issue content
ISSUE_FILE=$(mktemp)
echo "# Issue #$ISSUE_NUMBER: $ISSUE_TITLE" > "$ISSUE_FILE"
echo "" >> "$ISSUE_FILE"
echo "$ISSUE_BODY" >> "$ISSUE_FILE"
echo "" >> "$ISSUE_FILE"
echo "Labels: $ISSUE_LABELS" >> "$ISSUE_FILE"

# Use Claude Code to analyze and suggest a solution
echo -e "\nInvoking Claude Code to analyze the issue and suggest a solution..."
echo "This may take a few moments..."
claude "$ISSUE_BODY"  -p --allowedTools Edit

# Stage, commit and push changes
echo -e "\nStaging changes..."
git add .

echo "Committing changes..."
git commit -m "Fix #$ISSUE_NUMBER: $ISSUE_TITLE"

echo "Pushing changes to remote repository..."
git push -u origin "$BRANCH_NAME"

# Create PR description based on Claude's solution
PR_BODY=$(cat << EOL
This PR addresses issue #$ISSUE_NUMBER.

## Solution
$(grep -v "FILE: " claude_solution.txt | head -n 10)
...

## Changes
$(git diff --name-status HEAD^ HEAD | sed 's/^/- /')

Closes #$ISSUE_NUMBER
EOL
)

# Create pull request
echo -e "\nCreating pull request..."
PR_URL=$(gh pr create --title "Fix #$ISSUE_NUMBER: $ISSUE_TITLE" \
  --body "$PR_BODY" \
  --base main)

echo "Pull request created: $PR_URL"
echo "Done!"

# Cleanup
rm -f "$ISSUE_FILE" "$CLAUDE_PROMPT"
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

# Read README.md to understand project and add to context
README_CONTEXT=""
if [ -f "README.md" ]; then
  echo "Reading README.md to understand project requirements..."
  README_CONTEXT="$(cat README.md)"
else
  echo "WARNING: README.md not found in the current directory!"
fi

# Create a prompt for Claude Code
CLAUDE_PROMPT=$(mktemp)
cat > "$CLAUDE_PROMPT" << EOL
I'm working on a GitHub repository and need to solve issue #$ISSUE_NUMBER.

Here's the issue:
---
$ISSUE_TITLE

$ISSUE_BODY
---

Here's the README.md for context:
---
$README_CONTEXT
---

Please:
1. Analyze the issue and understand what needs to be changed
2. Identify which files need to be modified
3. Make the necessary changes to fix the issue
4. If necessary, update the README.md for non-minor changes
5. Make sure the changes follow the project's coding standards

After you make suggestions, I'll implement them, run linting checks, and create a pull request.
EOL

# Use Claude Code to analyze and suggest a solution
echo -e "\nInvoking Claude Code to analyze the issue and suggest a solution..."
echo "This may take a few moments..."
claude "$CLAUDE_PROMPT" > claude_solution.txt

echo -e "\nClaude Code has analyzed the issue. Here's the suggested solution:\n"
cat claude_solution.txt

# Ask user if they want to implement Claude's solution
echo -e "\nWould you like to implement the solution suggested by Claude Code?"
read -p "Implement solution? (y/n): " IMPLEMENT_SOLUTION

if [[ $IMPLEMENT_SOLUTION != "y" && $IMPLEMENT_SOLUTION != "Y" ]]; then
  echo "You can review Claude's solution in claude_solution.txt and implement changes manually."
  echo "Run the script again when you're ready to continue."
  exit 0
fi

# Ask Claude Code to implement the solution
echo -e "\nAsking Claude Code to implement the solution..."
cat > "$CLAUDE_PROMPT" << EOL
Based on our discussion about issue #$ISSUE_NUMBER, please provide the exact code changes needed.

For each file that needs to be modified, please format your response like this:

FILE: path/to/file.js
```
// Entire file content with the changes applied
```

This will allow me to programmatically apply these changes to the repository.
EOL

claude "$CLAUDE_PROMPT" > claude_implementation.txt

# Parse Claude's implementation and apply changes
echo -e "\nApplying changes suggested by Claude Code..."

# Extract file changes from Claude's response
FILES_TO_CHANGE=$(grep -n "FILE: " claude_implementation.txt | cut -d: -f1)
TOTAL_LINES=$(wc -l < claude_implementation.txt)

# Apply each file change
PREV_LINE=0
for LINE_NUM in $FILES_TO_CHANGE; do
  if [ $PREV_LINE -ne 0 ]; then
    FILENAME=$(sed -n "${PREV_LINE}p" claude_implementation.txt | sed 's/FILE: //')
    START_LINE=$((PREV_LINE + 1))
    END_LINE=$((LINE_NUM - 1))
    
    # Extract content between ```
    CONTENT=$(sed -n "${START_LINE},${END_LINE}p" claude_implementation.txt | sed -n '/```/,/```/p' | sed '1d;$d')
    
    echo "Updating file: $FILENAME"
    mkdir -p "$(dirname "$FILENAME")"
    echo "$CONTENT" > "$FILENAME"
  fi
  PREV_LINE=$LINE_NUM
done

# Handle the last file
if [ $PREV_LINE -ne 0 ]; then
  FILENAME=$(sed -n "${PREV_LINE}p" claude_implementation.txt | sed 's/FILE: //')
  START_LINE=$((PREV_LINE + 1))
  END_LINE=$TOTAL_LINES
  
  # Extract content between ```
  CONTENT=$(sed -n "${START_LINE},${END_LINE}p" claude_implementation.txt | sed -n '/```/,/```/p' | sed '1d;$d')
  
  echo "Updating file: $FILENAME"
  mkdir -p "$(dirname "$FILENAME")"
  echo "$CONTENT" > "$FILENAME"
fi

# Run linter to ensure code quality
echo -e "\nRunning linter..."
if npm run lint; then
  echo "Linting passed successfully!"
else
  echo -e "\nLinting issues found. Attempting to automatically fix linting issues..."
  
  # Most linters provide a fix option (e.g., eslint --fix)
  # Check if package.json has a lint:fix script
  if grep -q "\"lint:fix\"" package.json; then
    echo "Running npm run lint:fix..."
    npm run lint:fix
  else
    # If no dedicated lint:fix script exists, try to determine the linter being used
    if grep -q "eslint" package.json; then
      echo "Using ESLint to fix issues..."
      npx eslint --fix .
    elif grep -q "prettier" package.json; then
      echo "Using Prettier to fix issues..."
      npx prettier --write .
    else
      echo "Could not automatically determine how to fix linting issues."
      
      # Ask Claude Code to fix the linting issues
      echo "Asking Claude Code to fix linting issues..."
      LINT_OUTPUT=$(npm run lint 2>&1)
      
      cat > "$CLAUDE_PROMPT" << EOL
I implemented your suggested solution for issue #$ISSUE_NUMBER, but the code has linting errors.
Here's the output from the linter:

$LINT_OUTPUT

Please update the code to fix these linting issues.
EOL

      claude "$CLAUDE_PROMPT" > claude_lint_fix.txt
      
      echo "Claude Code has suggested lint fixes. Please review claude_lint_fix.txt and apply the changes."
      read -p "Press Enter to continue after applying lint fixes..."
    fi
  fi
  
  # Run lint again to check if issues were fixed
  echo -e "\nVerifying linting issues were fixed..."
  if ! npm run lint; then
    echo -e "\nSome linting issues could not be fixed automatically."
    read -p "Continue anyway? (y/n): " CONTINUE_WITH_LINT_ERRORS
    if [[ $CONTINUE_WITH_LINT_ERRORS != "y" && $CONTINUE_WITH_LINT_ERRORS != "Y" ]]; then
      echo "Please fix the remaining linting issues manually and run the script again."
      exit 1
    fi
  fi
fi

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
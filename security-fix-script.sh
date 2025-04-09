#!/bin/bash
# fix-dependabot-alerts.sh
# Script to automatically fix Dependabot security alerts and open PRs for Vue 3 projects

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it from https://cli.github.com/"
    exit 1
fi

# Ensure user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}You need to authenticate with GitHub first.${NC}"
    gh auth login
fi

# Get current repository info
REPO_INFO=$(gh repo view --json owner,name)
OWNER=$(echo $REPO_INFO | jq -r '.owner.login')
REPO=$(echo $REPO_INFO | jq -r '.name')

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
    echo -e "${RED}Error: Could not determine current repository.${NC}"
    echo "Make sure you're in a GitHub repository and have proper permissions."
    exit 1
fi

# Detect package manager (npm or yarn)
PACKAGE_MANAGER="npm"
if [ -f "yarn.lock" ]; then
    PACKAGE_MANAGER="yarn"
    echo -e "${GREEN}Detected yarn as package manager${NC}"
elif [ -f "package-lock.json" ]; then
    echo -e "${GREEN}Detected npm as package manager${NC}"
fi

# Create a new branch for fixes
BRANCH_NAME="fix/dependabot-alerts-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH_NAME"

echo -e "${GREEN}Created branch ${BRANCH_NAME} for security fixes${NC}"

# Fetch open security alerts
echo "Fetching Dependabot security alerts..."
ALERTS=$(gh api "repos/${OWNER}/${REPO}/dependabot/alerts?state=open" --jq '.[]')

if [ -z "$ALERTS" ]; then
    echo -e "${GREEN}No open security alerts found!${NC}"
    git checkout - # Return to previous branch
    git branch -D "$BRANCH_NAME"
    exit 0
fi

# Count alerts
ALERT_COUNT=$(echo "$ALERTS" | jq -s 'length')
echo -e "${YELLOW}Found ${ALERT_COUNT} open security alerts.${NC}"

# Process each alert
FIXED_COUNT=0
FAILED_COUNT=0
FIXED_DEPS=""

echo "$ALERTS" | jq -c '.' | while read -r alert; do
    ALERT_NUMBER=$(echo $alert | jq -r '.number')
    PACKAGE_NAME=$(echo $alert | jq -r '.dependency.package.name')
    MANIFEST_PATH=$(echo $alert | jq -r '.dependency.manifest_path')
    VULNERABLE_VERSION=$(echo $alert | jq -r '.dependency.version')
    SEVERITY=$(echo $alert | jq -r '.security_vulnerability.severity')
    
    # Get details for a specific alert
    ALERT_DETAIL=$(gh api "repos/${OWNER}/${REPO}/dependabot/alerts/${ALERT_NUMBER}")
    
    # Extract recommended version (if available)
    RECOMMENDED_VERSION=$(echo $ALERT_DETAIL | jq -r '.security_advisory.vulnerabilities[0].patched_versions // "latest"')
    
    echo -e "\n${YELLOW}Processing alert #${ALERT_NUMBER}:${NC}"
    echo "Package: $PACKAGE_NAME (Currently: $VULNERABLE_VERSION)"
    echo "Severity: $SEVERITY"
    echo "Manifest: $MANIFEST_PATH"
    
    # Vue 3 project will use package.json
    if [ -f "$MANIFEST_PATH" ]; then
        echo "Updating package $PACKAGE_NAME..."
        
        # Check if it's a dev dependency
        IS_DEV_DEP=$(jq ".devDependencies | has(\"$PACKAGE_NAME\")" package.json)
        INSTALL_FLAG=""
        if [ "$IS_DEV_DEP" = "true" ]; then
            INSTALL_FLAG="--save-dev"
        else
            INSTALL_FLAG="--save"
        fi
        
        # Install using appropriate package manager
        if [ "$PACKAGE_MANAGER" = "yarn" ]; then
            if [[ "$RECOMMENDED_VERSION" == "latest" ]]; then
                yarn add $INSTALL_FLAG "$PACKAGE_NAME@latest"
            else
                # Convert semantic version range to yarn/npm format
                FIXED_VERSION=$(echo "$RECOMMENDED_VERSION" | sed 's/>=/^/g')
                yarn add $INSTALL_FLAG "$PACKAGE_NAME@$FIXED_VERSION"
            fi
        else
            if [[ "$RECOMMENDED_VERSION" == "latest" ]]; then
                npm install $INSTALL_FLAG "$PACKAGE_NAME@latest"
            else
                # Convert semantic version range to npm format
                FIXED_VERSION=$(echo "$RECOMMENDED_VERSION" | sed 's/>=/^/g')
                npm install $INSTALL_FLAG "$PACKAGE_NAME@$FIXED_VERSION"
            fi
        fi
        
        if [ $? -eq 0 ]; then
            # Check what the actual installed version is
            if [ "$PACKAGE_MANAGER" = "yarn" ]; then
                INSTALLED_VERSION=$(yarn list --pattern "^$PACKAGE_NAME$" --depth=0 | grep -o "$PACKAGE_NAME@[^ ]*" | cut -d@ -f2)
            else
                INSTALLED_VERSION=$(npm list "$PACKAGE_NAME" --depth=0 --json | jq -r ".dependencies.\"$PACKAGE_NAME\".version")
            fi
            
            FIXED_COUNT=$((FIXED_COUNT + 1))
            if [ -n "$INSTALLED_VERSION" ]; then
                FIXED_DEPS="$FIXED_DEPS\n- $PACKAGE_NAME: $VULNERABLE_VERSION → $INSTALLED_VERSION"
            else
                FIXED_DEPS="$FIXED_DEPS\n- $PACKAGE_NAME: $VULNERABLE_VERSION → $RECOMMENDED_VERSION"
            fi
        else
            echo -e "${RED}Failed to update $PACKAGE_NAME${NC}"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    else
        echo -e "${RED}Manifest file $MANIFEST_PATH not found${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
done

# Run npm/yarn check for breaking changes
echo -e "${YELLOW}Running tests to verify changes don't break the application...${NC}"
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
    yarn install
    TEST_RESULT=$?
    if [ -f "package.json" ] && [ "$(jq -r '.scripts | has("test")' package.json)" = "true" ]; then
        yarn test
        TEST_RESULT=$?
    fi
else
    npm install
    TEST_RESULT=$?
    if [ -f "package.json" ] && [ "$(jq -r '.scripts | has("test")' package.json)" = "true" ]; then
        npm test
        TEST_RESULT=$?
    fi
fi

# Check if any fixes were made
if [ $FIXED_COUNT -eq 0 ]; then
    echo -e "${YELLOW}No fixes were applied.${NC}"
    git checkout - # Return to previous branch
    git branch -D "$BRANCH_NAME"
    exit 0
fi

# Additional check for Vue-specific files
if [ $TEST_RESULT -ne 0 ]; then
    echo -e "${YELLOW}Warning: Tests failed after dependency updates. You may need to review changes manually.${NC}"
fi

# Try to build the project to check for compatibility
echo -e "${YELLOW}Building the Vue project to verify updates...${NC}"
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
    if [ "$(jq -r '.scripts | has("build")' package.json)" = "true" ]; then
        yarn build
        BUILD_RESULT=$?
    else
        BUILD_RESULT=0
    fi
else
    if [ "$(jq -r '.scripts | has("build")' package.json)" = "true" ]; then
        npm run build
        BUILD_RESULT=$?
    else
        BUILD_RESULT=0
    fi
fi

if [ $BUILD_RESULT -ne 0 ]; then
    echo -e "${YELLOW}Warning: Build failed after dependency updates. You may need to review changes manually.${NC}"
fi

# Commit changes
git add .
git commit -m "fix: Update Vue dependencies to fix security vulnerabilities" -m "Fix $FIXED_COUNT Dependabot security alerts$FIXED_DEPS"

# Push branch to remote
git push -u origin "$BRANCH_NAME"

# Create pull request
PR_URL=$(gh pr create --title "Fix Vue.js Dependabot Security Alerts" \
  --body "This PR updates Vue 3 project dependencies to fix $FIXED_COUNT security vulnerabilities reported by Dependabot.

### Fixed Dependencies:$FIXED_DEPS

### Compatibility Checks
- Build: $([ $BUILD_RESULT -eq 0 ] && echo '✅ Passed' || echo '⚠️ Failed - please review')
- Tests: $([ $TEST_RESULT -eq 0 ] && echo '✅ Passed' || echo '⚠️ Failed - please review')

$([ $FAILED_COUNT -gt 0 ] && echo "### Remaining Issues
$FAILED_COUNT alerts could not be automatically fixed and need manual review." || echo "")

This PR was automatically generated." \
  --label "security" \
  --label "dependencies" \
  --label "vue")

echo -e "${GREEN}Pull request created: $PR_URL${NC}"
echo -e "${GREEN}Successfully fixed $FIXED_COUNT of $ALERT_COUNT security vulnerabilities.${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}$FAILED_COUNT alerts require manual intervention.${NC}"
fi

# Return to the original branch
git checkout -

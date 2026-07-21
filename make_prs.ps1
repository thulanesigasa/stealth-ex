# PR 1: Background Script Structure
git checkout -b feature/background-structure
New-Item -Path "src/background" -ItemType Directory -Force | Out-Null
Move-Item "background.js" "src/background/index.js" -Force
git add .
git commit -m "feat: restructure background script for production"
git push -u origin feature/background-structure
gh pr create --title "feat: restructure background script for production" --body "Moves background script to src/background/index.js"
gh pr merge --merge --delete-branch
git checkout main
git pull

# PR 2: Content Script Structure
git checkout -b feature/content-structure
New-Item -Path "src/content" -ItemType Directory -Force | Out-Null
Move-Item "content.js" "src/content/index.js" -Force
New-Item -Path "src/content/ui.js" -ItemType File -Value "// UI rendering logic for content script" | Out-Null
git add .
git commit -m "feat: restructure content script for production"
git push -u origin feature/content-structure
gh pr create --title "feat: restructure content script for production" --body "Moves content script to src/content/"
gh pr merge --merge --delete-branch
git checkout main
git pull

# PR 3: Styles Structure
git checkout -b feature/styles-structure
New-Item -Path "src/styles" -ItemType Directory -Force | Out-Null
Move-Item "style.css" "src/styles/content.css" -Force
git add .
git commit -m "feat: restructure styles for production"
git push -u origin feature/styles-structure
gh pr create --title "feat: restructure styles for production" --body "Moves styles to src/styles/"
gh pr merge --merge --delete-branch
git checkout main
git pull

# PR 4: Options Structure
git checkout -b feature/options-structure
New-Item -Path "src/options" -ItemType Directory -Force | Out-Null
Move-Item "options.html" "src/options/index.html" -Force
Move-Item "options.js" "src/options/index.js" -Force
git add .
git commit -m "feat: restructure options for production"
git push -u origin feature/options-structure
gh pr create --title "feat: restructure options for production" --body "Moves options to src/options/"
gh pr merge --merge --delete-branch
git checkout main
git pull

# PR 5: Update Manifest
git checkout -b feature/manifest-update
$manifest = Get-Content manifest.json -Raw | ConvertFrom-Json
$manifest.background.service_worker = "src/background/index.js"
$manifest.content_scripts[0].js = @("src/content/index.js")
$manifest.content_scripts[0].css = @("src/styles/content.css")
$manifest.options_page = "src/options/index.html"
$manifest | ConvertTo-Json -Depth 10 | Set-Content manifest.json
git add .
git commit -m "chore: update manifest paths to production structure"
git push -u origin feature/manifest-update
gh pr create --title "chore: update manifest paths to production structure" --body "Updates manifest.json to point to new src/ structure"
gh pr merge --merge --delete-branch
git checkout main
git pull

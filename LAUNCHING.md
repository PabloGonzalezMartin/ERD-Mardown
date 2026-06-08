1. Upgrade version in package.json ("version": "x.y.z") and CHANGELOG.md, then commit with message "Release x.y.z"
2. Run `npm run compile` to compile the extension host
3. cd webview && npx tsc --noEmit to type-check the WebView
4. cd .. && npm run build to build the WebView and extension host
5. npm run package to create .vsix package for marketplace
6. Upload in marketplace and publish release on GitHub with .vsix attached
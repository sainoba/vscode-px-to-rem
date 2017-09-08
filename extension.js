// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    var disposable = vscode.commands.registerTextEditorCommand('extension.remToPx', function (textEditor, textEditorEdit) {
        const config = vscode.workspace.getConfiguration("px-to-rem");
        const pxPerRem = config.get('px-per-rem');
        var regexStr = "([0-9]*\\.?[0-9]+)rem";
        placeholder(regexStr,(match, value) => `${rem2Px(value, pxPerRem)}px`, textEditor, textEditorEdit);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerTextEditorCommand('extension.pxToRem', function (textEditor, textEditorEdit) {
        const config = vscode.workspace.getConfiguration("px-to-rem");
        const pxPerRem = config.get('px-per-rem');
        var regexStr = "([0-9]*\\.?[0-9]+)px";
        placeholder(regexStr,(match, value) => `${px2Rem(value, pxPerRem)}rem`, textEditor, textEditorEdit);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerTextEditorCommand('extension.pxToremAndRemToPx', function (textEditor, textEditorEdit) {
        const config = vscode.workspace.getConfiguration("px-to-rem");
        const pxPerRem = config.get('px-per-rem');
        var regexStr = "([0-9]*\\.?[0-9]+)(px|rem)";
        placeholder(regexStr,(match, value, unit) => unit == "px" ? `${px2Rem(value, pxPerRem)}rem` : `${rem2Px(value, pxPerRem)}px`, textEditor, textEditorEdit);
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}

function px2Rem(px, pxPerRem) {
    if(pxPerRem == 0 ) {return 0;}
    const config = vscode.workspace.getConfiguration("px-to-rem");
    var  maxDecimals = config.get('number-of-decimals-digits');
    maxDecimals = Math.max(1, maxDecimals);
    const value = parseFloat((px / pxPerRem).toFixed(maxDecimals));
    return value;
}
function rem2Px(rem, pxPerRem) {
    const config = vscode.workspace.getConfiguration("px-to-rem");
    var  maxDecimals = config.get('number-of-decimals-digits');
    maxDecimals = Math.max(1, maxDecimals);
    const value = parseFloat((rem * pxPerRem).toFixed(maxDecimals));
    return value;
}

function placeholder(regexString, replaceFunction, textEditor, textEditorEdit) {
    let regexExp = new RegExp(regexString);
    let regexExpG = new RegExp(regexString, "g")
    // Check if there is some text selected
    const selections = textEditor.selections;
    if (selections.length == 0 || selections.reduce((acc, val) => acc || val.isEmpty), false) { return; }
    // Get configuration options
    const config = vscode.workspace.getConfiguration("px-to-rem");
    const onlyChangeFirst = config.get('only-change-first-ocurrence');
    const warningIfNoChanges = config.get('notify-if-no-changes');

    // Declaration of auxiliar variables
    let numOcurrences = 0;
    selections.forEach(function(selection) {
        if (selection.isEmpty) {return;}
        // Iterates over each selected line
        for (var index = selection.start.line; index <= selection.end.line; index++) {
            let start, end;
            // Gets the first and last selected characters for the line
            start = (index == selection.start.line) ? selection.start.character : 0;
            end = (index == selection.end.line) ? selection.end.character : textEditor.document.lineAt(index).range.end.character;
            // Gets the text of the line
            let text = textEditor.document.lineAt(index).text.slice(start, end);
            // Counts the number of thimes the regex appears in the line
            const matches = text.match(regexExpG);
            numOcurrences += matches ? matches.length : 0;
            if (numOcurrences == 0) { continue; } // No ocurrences, so it's worth continuing
            const regex = onlyChangeFirst ? regexExp : regexExpG;
            //
            const newText = text.replace(regex, replaceFunction);
            // Replace text in the text file
            const selectionTmp = new vscode.Selection(index, start, index, end);
            textEditorEdit.replace(selectionTmp, newText);

        }
        // Display a message box to the user
        // vscode.window.showInformationMessage('Hello World!');
            return;
    }, this);
    if (warningIfNoChanges && (numOcurrences == 0)) {
        vscode.window.showWarningMessage("There were no values to transform");
    }
};

exports.deactivate = deactivate;
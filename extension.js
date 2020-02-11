// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require("vscode");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json

  var disposable = vscode.commands.registerTextEditorCommand(
    "extension.remToPx",
    function(textEditor, textEditorEdit) {
      const config = vscode.workspace.getConfiguration("px-to-rem");
      const pxPerRem = config.get("px-per-rem");
      var regexStr = "([0-9]*\\.?[0-9]+)rem";
      placeholder(
        regexStr,
        (match, value) => `${rem2Px(value, pxPerRem)}px`,
        textEditor,
        textEditorEdit
      );
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerTextEditorCommand(
    "extension.pxToRem",
    function(textEditor, textEditorEdit) {
      const config = vscode.workspace.getConfiguration("px-to-rem");
      const pxPerRem = config.get("px-per-rem");
      var regexStr = "([0-9]*\\.?[0-9]+)px";
      placeholder(
        regexStr,
        (match, value) => `${px2Rem(value, pxPerRem)}rem`,
        textEditor,
        textEditorEdit
      );
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerTextEditorCommand(
    "extension.pxToremAndRemToPx",
    function(textEditor, textEditorEdit) {
      const config = vscode.workspace.getConfiguration("px-to-rem");
      const pxPerRem = config.get("px-per-rem");
      var regexStr = "([0-9]*\\.?[0-9]+)(px|rem)";
      placeholder(
        regexStr,
        (match, value, unit) =>
          unit == "px"
            ? `${px2Rem(value, pxPerRem)}rem`
            : `${rem2Px(value, pxPerRem)}px`,
        textEditor,
        textEditorEdit
      );
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "extension.pxPerRem",
    async () => {
      const config = vscode.workspace.getConfiguration("px-to-rem");
      const pxPerRem = config.get("px-per-rem");
      var inputValue = await vscode.window.showInputBox({
        prompt: "Number of pixels per 1 rem. Default is 16.",
        value: `${pxPerRem}`,
        placeHolder: "Default value is 16"
      });
      if (typeof inputValue == "undefined") {
        // Closed input box
        return;
      }
      inputValue = inputValue.trim();
      if (inputValue === "") {
        inputValue = 16;
      }
      const newPxPerRem = parseInt(inputValue);
      if (isNaN(newPxPerRem)) {
        vscode.window.showErrorMessage(
          `${inputValue} is not a valid integer to set as px per rem.`
        );
        return;
      }
      config.update("px-per-rem", newPxPerRem);
      vscode.window.showInformationMessage(
        `Px per rem has updated to ${newPxPerRem}px`
      );
    }
  );
  context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

function px2Rem(px, pxPerRem) {
  if (pxPerRem == 0) {
    return 0;
  }
  const config = vscode.workspace.getConfiguration("px-to-rem");
  var maxDecimals = config.get("number-of-decimals-digits");
  maxDecimals = Math.max(0, maxDecimals);
  const value = parseFloat((px / pxPerRem).toFixed(maxDecimals));
  return value;
}
function rem2Px(rem, pxPerRem) {
  const config = vscode.workspace.getConfiguration("px-to-rem");
  var maxDecimals = config.get("number-of-decimals-digits");
  maxDecimals = Math.max(0, maxDecimals);
  const value = parseFloat((rem * pxPerRem).toFixed(maxDecimals));
  return value;
}

function placeholder(regexString, replaceFunction, textEditor, textEditorEdit) {
  let regexExp = new RegExp(regexString, "i");
  let regexExpG = new RegExp(regexString, "ig");
  // clones selections
  const selections = textEditor.selections;
  // Check if there is some text selected
  if (
    (selections.length == 0 ||
      selections.reduce((acc, val) => acc || val.isEmpty),
    false)
  ) {
    return;
  }
  // Get configuration options
  const config = vscode.workspace.getConfiguration("px-to-rem");
  const onlyChangeFirst = config.get("only-change-first-ocurrence");
  const warningIfNoChanges = config.get("notify-if-no-changes");
  const changesMade = new Map();
  textEditor
    .edit(builder => {
      // Declaration of auxiliar variables
      let numOcurrences = 0;
      selections.forEach(selection => {
        // Iterates over each selected line
        for (
          var index = selection.start.line;
          index <= selection.end.line;
          index++
        ) {
          let start = 0,
            end = textEditor.document.lineAt(index).range.end.character;
          // Gets the first and last selected characters for the line
          if (index === selection.start.line) {
            let tmpSelection = selection.with({ end: selection.start });
            let range = findValueRangeToConvert(
              tmpSelection,
              regexString,
              textEditor
            );
            if (range) {
              start = range.start.character;
            } else {
              start = selection.start.character;
            }
          }
          if (index === selection.end.line) {
            let tmpSelection = selection.with({ start: selection.end });
            let range = findValueRangeToConvert(
              tmpSelection,
              regexString,
              textEditor
            );
            if (range) {
              end = range.end.character;
            } else {
              end = selection.end.character;
            }
          }
          // Gets the text of the line
          let text = textEditor.document.lineAt(index).text.slice(start, end);
          // Counts the number of times the regex appears in the line
          const matches = text.match(regexExpG);
          numOcurrences += matches ? matches.length : 0;
          if (numOcurrences == 0) {
            continue;
          } // No ocurrences, so it's worth continuing
          const regex = onlyChangeFirst ? regexExp : regexExpG;
          //
          const newText = text.replace(regex, replaceFunction);
          // Replace text in the text file
          const selectionTmp = new vscode.Selection(index, start, index, end);
          const key = `${index}-${start}-${end}`;
          if (!changesMade.has(key)) {
            changesMade.set(key, true);
            builder.replace(selectionTmp, newText);
          }
        }
        return;
      }, this);
      if (warningIfNoChanges && numOcurrences == 0) {
        vscode.window.showWarningMessage("There were no values to transform");
      }
    })
    .then(success => {
      textEditor.selections.forEach((selection, index, newSelections) => {
        if (selections[index].start.isEqual(selections[index].end)) {
          const newPosition = selection.end;
          const newSelection = new vscode.Selection(newPosition, newPosition);
          textEditor.selections[index] = newSelection;
        }
      });
      textEditor.selections = textEditor.selections;
      if (!success) {
        console.log(`Error: ${success}`);
      }
    });
}

function findValueRangeToConvert(selection, regexString, textEditor) {
  const line = selection.start.line;
  const startChar = selection.start.character;
  const text = textEditor.document.lineAt(line).text;
  const regexExpG = new RegExp(regexString, "ig");

  var result,
    indices = [];
  while ((result = regexExpG.exec(text))) {
    const resultStart = result.index;
    const resultEnd = result.index + result[0].length;
    if (startChar >= resultStart && startChar <= resultEnd) {
      return new vscode.Range(line, resultStart, line, resultEnd);
    }
  }
  return null;
}

exports.deactivate = deactivate;

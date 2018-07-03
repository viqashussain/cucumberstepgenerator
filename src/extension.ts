'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ncp from 'copy-paste'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    let disposable = vscode.commands.registerCommand('extension.generateStep', () => {
        // The code you place here will be executed every time your command is executed

        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please highlight a feature step.');
            return; // No open text editor
        }

        let text = editor.document.lineAt(editor.selection.start.line).text.trim();

        if (!text || (!text.startsWith('Given') && !text.startsWith('When') && !text.startsWith('Then') && !text.startsWith('And')))
        {
            vscode.window.showErrorMessage('Invalid step selected.');
            return;
        }
        if (!editor.selection.isSingleLine)
        {
            vscode.window.showErrorMessage('Please only select a single line');
            return;
        }
        else
        {
            let newStep = [];
            let stepType = getStepType(text, editor.selection, editor);

            let stepMethodName = getStepMethodName(text, stepType);

            let stepText = getStepName(text);

            let stepParams = getParamsString(text, editor.selection, editor);

            newStep.push(`export const ${stepMethodName} = ${stepType} => {\n`);
            newStep.push(`  ${stepType}(/${stepText}/, (${stepParams}) => {\n`);
            newStep.push(`\n`);
            newStep.push(`  });`);
            newStep.push(`\n}`);

            let finalStepString = newStep.join("");
            ncp.copy(finalStepString);
            vscode.window.showInformationMessage("Step successfully copied to clipboard!");
        }

        // Display a message box to the user
        // console.log('Selected characters: ' + text.length);
    });
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function getStepName(rawStep: string): string
{
    let allStepWords = rawStep.split(' ');
    allStepWords.shift();
    if (allStepWords)
    {
        return replaceRegexString(allStepWords.join(' '), "'(.*)'");
    }
    return '';
}

function getStepType(rawStep: string, selection: any, editor: vscode.TextEditor): string
{
    if (rawStep.startsWith("Then "))
        return 'then'
    else if (rawStep.startsWith("When "))
        return 'when'
    else if (rawStep.startsWith("Given "))
        return 'given';
    else if (rawStep.startsWith("And "))
        return getStepTypeForAnd(selection, editor)
    return '';
}

function getStepTypeForAnd(selection: any, editor: vscode.TextEditor): string
{
    for (let i = selection.start.line - 1; i < editor.document.lineCount; i--)
    {
        let previousLineText = editor.document.lineAt(i).text.trim();
        if (previousLineText.startsWith('And') || previousLineText.startsWith('|'))
            continue;
        return decapitalizeFirstLetter(previousLineText.split(' ')[0]);
    }
    return '';
}

function getStepMethodName(rawStep: string, stepTypeName: string): string
{
    let stepMethodName: string[] = [];
    let rawStepWords = rawStep.split(' ');
    for(let i = 0; i < rawStepWords.length; i++)
    {
        if (i == 0)
        {
            stepMethodName.push(decapitalizeFirstLetter(stepTypeName));
        }
        else
        {
            stepMethodName.push(capitalizeFirstLetter(rawStepWords[i]));
        }
    }
    return replaceRegexString(stepMethodName.join(''), "");
}

function capitalizeFirstLetter(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function decapitalizeFirstLetter(word: string): string {
    return word.charAt(0).toLowerCase() + word.slice(1);
}

function replaceRegexString(methodName: string, replacementString: string): string {
    let stringToReturn = methodName;
    let regex = RegExp(/'.*?'/g);
    var regMatch = methodName.match(regex);
    if (regMatch)
    {
        regMatch.forEach((stringToReplace: string) =>
        {
            stringToReturn = stringToReturn.replace(stringToReplace, replacementString);
        })
    }
    return stringToReturn;
}

function getParamsString(rawStep: string, selection: any, editor: vscode.TextEditor): string
{
    let paramString: string[] = [];
    let regex = RegExp(/'.*?'/g);
    var regMatch = rawStep.match(regex);
    
    if (regMatch)
    {
        for(let i = 0; i < regMatch.length; i++)
        {
            if (paramString.length > 0)
            {
                paramString.push(', ')
            }
            paramString.push(`param${i}: any`)
        }
    }
    if (stepHasTable(selection, editor))
    {
        if (paramString.length > 0)
        {
            paramString.push(', ')
        }
        paramString.push('table: any[]')
    }

    return paramString.join('');
}

function stepHasTable(selection: any, editor: vscode.TextEditor): boolean
{
    if (editor.document.lineCount === selection.start.line + 1)
    {
        return false;
    }
    let nextLineText = editor.document.lineAt(selection.start.line + 1).text;
    return nextLineText.includes('|');
}
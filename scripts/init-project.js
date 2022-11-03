const fs = require('fs');
const path = require('path');

const sourcePath = `./src`;
const templatesPath = `${sourcePath}/templates`;
const htmlPath = `${templatesPath}/html.js`;
const scriptTemplatePath = `./scripts/templates`;

var config;
try {
    config = loadConfig(absolutePath('./evolv-config.json'));
    generateFolders(config);
    console.info('folder generation completed');
} catch (e) {
    console.info('error:', e);
}

//support functions
function absolutePath(path) {
    return path;
}

function loadConfig(configPath) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function generateFolders(config) {
    //do we need a guard?
    validateTopFolders();
    config.contexts.forEach((context) => {
        var contextPath = `${sourcePath}/${context.id}`;
        validateContextFiles(contextPath);
        context.variables.forEach((variable) => {
            var variablePath = `${contextPath}/${variable.id}`;
            validateVariableFiles(variablePath);
            variable.variants.forEach((variant) => {
                var variantPath = `${variablePath}/${variant.id}`;
                validateVariantFiles(variantPath, variant);
            });
        });
    });
}

function replaceText(filePath, tag, newText) {
    fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        console.info('replacing text', filePath, tag, newText);
        var matchTag = new RegExp(tag, 'g');
        var result = data.replace(matchTag, newText);

        fs.writeFile(filePath, result, 'utf8', function (err) {
            if (err) return console.log(err);
        });
    });
}
function getTopFiles() {
    return [
        {
            file: `${templatesPath}/html.js`,
            template: `${scriptTemplatePath}/html.js`,
        },
    ];
}

function getContextFiles(contextPath) {
    return [
        {
            file: `${contextPath}/context.js`,
            template: `${scriptTemplatePath}/context.js`,
        },
        {
            file: `${contextPath}/context.scss`,
            template: null,
        },
        {
            file: `${contextPath}/setup.js`,
            template: `${scriptTemplatePath}/setup.js`,
            postProcess: () =>
                replaceText(
                    `${contextPath}/setup.js`,
                    '__sandbox__',
                    config.id
                ),
        },
        {
            file: `${contextPath}/instrumentPage.js`,
            template: `${scriptTemplatePath}/instrumentPage.js`,
        },
    ];
}

function getVariableFiles(variablePath) {
    return [
        {
            file: `${variablePath}/common.js`,
            template: `${scriptTemplatePath}/common.js`,
        },
    ];
}

function getVariantFiles(variantPath, variantTag) {
    return [
        {
            file: `${variantPath}.js`,
            template: `${scriptTemplatePath}/variant.js`,
            postProcess: () =>
                replaceText(`${variantPath}.js`, '__variant__', variantTag),
        },
        {
            file: `${variantPath}.scss`,
            template: null,
        },
    ];
}

function initializeFolder(folderPath) {
    console.info('initialization of folder', folderPath);
    if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
        fs.mkdirSync(folderPath);
    }
}

function initializeFile(fileObj) {
    console.info('initializing file', fileObj);
    if (!fs.existsSync(fileObj.file)) {
        if (fileObj.template) {
            fs.copyFileSync(fileObj.template, fileObj.file);
            if (fileObj.postProcess) {
                console.info('postProcessing');
                fileObj.postProcess();
            }
        } else {
            fs.closeSync(fs.openSync(fileObj.file, 'w'));
        }
    }
}

function validateTopFolders() {
    initializeFolder(sourcePath);
    initializeFolder(templatesPath);
    getTopFiles().forEach(initializeFile);
}

function validateContextFiles(contextPath) {
    initializeFolder(contextPath);
    getContextFiles(contextPath).forEach(initializeFile);
}

function validateVariableFiles(variablePath) {
    initializeFolder(variablePath);
    getVariableFiles(variablePath).forEach(initializeFile);
}

function validateVariantFiles(variantPath, variant) {
    getVariantFiles(variantPath, variant.id).forEach(initializeFile);
}

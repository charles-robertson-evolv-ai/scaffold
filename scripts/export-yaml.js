const Base64 = require('base-64');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { URL } = require('url');

//update yml with config updates
try {
    var config = loadConfig(absolutePath('./evolv-config.json'));
    var package = loadConfig(absolutePath('./package.json'));
    var newModel = mergeToYaml(config);
    saveYaml(newModel, config.output || `/export/dist/${package.name}.yml`);
    console.info('merge completed');
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

// function loadYaml(yamlPath){
//   var ymlData = fs.readFileSync(yamlPath, 'utf-8')
//   return yaml.load(ymlData);
// }

function saveYaml(yamlModel, yamlPath) {
    const newYmlContent = yaml.dump(yamlModel);
    fs.writeFileSync(yamlPath, newYmlContent);
}

function generatePreviewLinks(config) {
    var context = config.contexts[0];
    return [
        {
            uri: 'evolv-web://view/{account_id}/{metamodel_id}/{metamodel_version}?project_name={project_name}&combination={combination}',
            display_name: 'Preview in Web Editor',
        },
        {
            uri: `${context.referenceUrls[0]}#evolvCandidateToken={candidate_token}`,
            display_name: 'Preview in Browser',
        },
    ];
}

function mergeToYaml(config) {
    var newYaml = {};

    newYaml._version = '1';
    newYaml._name = config.name || '';
    newYaml._metadata = {
        base_url: config.baseUrl || config.contexts[0].reference_urls,
        controlsEditable: false,
        treeShakeDependencies: false,
        enableSass: false,
        dependencies: [],
    };

    newYaml.web = {};
    newYaml.web._metadata = {};
    newYaml.web._config = { dependencies: '' };

    config.contexts.forEach((context) => {
        var contextId = `${config.id}_${context.id}`;
        var newContext = mergeContext(context, contextId, config.baseUrl || '');
        context.variables.forEach((variable) => {
            var variableId = `${contextId}_${variable.id}`;
            var basePath = `./dist/${context.id}/${variable.id}`;
            variable.variants.forEach(
                (v) => (v.source = `${basePath}/${v.id}`)
            );
            var variants = [
                generateControl(),
                ...variable.variants.map((variant) =>
                    mergeVariant(variant, `${variableId}_${variant.id}`)
                ),
            ];
            newContext[variableId] = mergeVariable(
                variable,
                variableId,
                variants
            );
        });

        newContext._expanded = true;
        newContext._description = context.description || '';
        newYaml.web[contextId] = newContext;
    });

    newYaml.web._combination_previews = generatePreviewLinks(config);

    return newYaml;
}

function getUrlCond(context) {
    var condition = context.condition;

    return condition['web.url'] || condition['and']['web.url'];
}

function buildPredicates(context, baseUrl) {
    var url = new URL(baseUrl);
    var protocol = url.protocol.slice(0, -1);
    var baseUrlValue = `${protocol}?://${url.host}/`;
    var condition = context.condition;

    function buildRule(key, value, operator) {
        operator = operator || 'regex64_match';
        return {
            field: key,
            operator,
            value: Base64.encode(
                new RegExp(
                    'web.url' === key ? `${baseUrlValue}${value}` : value,
                    'i'
                )
            ),
        };
    }
    return {
        combinator: 'and',
        rules: Object.keys(condition).map((key) =>
            buildRule(key, condition[key])
        ),
        id: `${context.id}-${Object.keys(condition).length}`, //kind of arbitrary
    };
}

function mergeContext(context, contextId, baseUrl) {
    var closingLength = 7;
    var contextSuffix = `
    rule.isActive = function(){
      return [...document.querySelector('html').classList].includes("evolv_web_${context.id}")
    };
  `;
    var contextPath = `./dist/${context.id}/context`;

    var jsAsset = fs.readFileSync(absolutePath(`${contextPath}.js`), 'utf8');
    var cssPath = absolutePath(`${contextPath}.css`);
    var assets = {
        javascript:
            jsAsset.slice(0, -closingLength) +
            contextSuffix +
            jsAsset.slice(-closingLength),
        css: fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '',
    };

    var newContext = {};

    newContext._id = contextId;
    newContext._display_name = context.display_name || '';

    newContext._metadata = {
        page_def: {
            domain_match_type: 'full',
            path_match_type: 'regex',
            reference_urls: context.referenceUrls,
            _pattern: getUrlCond(context),
            is_entry_context: true,
        },
        script: assets.javascript,
        styles: assets.css,
    };

    newContext._disable = false;

    newContext._config = {
        _id: contextId,
        _type: 'url',
        _is_entry_point: true,
        _predicate: buildPredicates(context, baseUrl),
        _initializers: [
            { type: 'css', code: assets['css'] },
            { type: 'javascript', code: assets['javascript'] },
        ],
    };

    return newContext;
}

function mergeVariable(variable, variableId, values) {
    var newVariable = {};
    newVariable._values = values;

    newVariable._id = variableId;
    newVariable._display_name = variable.display_name || '';
    newVariable._metadata = {};
    newVariable._disable = variable.disable || false;
    newVariable._description = variable.description || '';
    newVariable._expanded = true;
    newVariable._config = {
        _id: variableId,
        _type: 'manual',
        _is_entry_point: variable.is_entry_point || false,
        _predicate: variable.predicate || null,
        _initializers: [],
    };

    return newVariable;
}

function generateControl() {
    var yamlValue = {};
    console.info('merging control', yamlValue);
    yamlValue._display_name = 'Control';

    yamlValue._metadata = { uses_noop: true, generated_control: true };
    yamlValue._value = { type: 'noop' };
    yamlValue._disable = false;
    yamlValue._screenshots = [];
    return yamlValue;
}

function mergeVariant(variant, variantId) {
    var yamlValue = {};
    console.info('processing variant', variant.display_name, yamlValue);
    // if (!yamlValue || !(yamlValue._value)) return generateControl(yamlValue)

    yamlValue._reference_id = variantId;
    yamlValue._display_name = variant.display_name || '';

    yamlValue._value = { id: variantId };

    if (variant.source) {
        var jsPath = absolutePath(`${variant.source}.js`);
        var cssPath = absolutePath(`${variant.source}.css`);

        yamlValue._value.script = fs.readFileSync(jsPath, 'utf8');
        yamlValue._value.styles = fs.existsSync(cssPath)
            ? fs.readFileSync(cssPath, 'utf8')
            : '';
        yamlValue._value.type = variant.type || 'compound';
        yamlValue._value._metadata = variant.metadata || {};
    }

    yamlValue._disable = variant.disable || false;
    yamlValue._metadata = variant.metadata || {};
    yamlValue._screenshots = [];

    return yamlValue;
}

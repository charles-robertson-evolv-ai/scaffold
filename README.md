# scaffold
Scaffolding for developing and building an experiment using rollup


## Generating a project
To start a new project named `myProject` with the scaffold, use the following command line:

```npx degit git@github.com:charles-robertson-evolv-ai/scaffold.git --mode=git myProject```

Then got into the folder:

```cd myProject```

And then, run:

```npm install```

Now you are all ready to develop your project

## Create your folders with json

To create your folders (and scaffolded files) for the project, edit the `evolv-config.json`. 

**Note**: *Make sure you update the experiment id, reference url, and web.url value.*

Once you have your experiment outline specified in the json, run the following to build your folder structure:

```npm run folder:build```

## Develop Experiment Code

### Context Guidelines
tbd

### Concept Guidelines
tbd

### Variant Guidelines
tbd
### Examples
The following experiments are examples of usage
tbd
## Start Development Server
This starts the development server to be served up to the browser.
```
npm run server:dev
```

## Setup Resource Override
There is a chrome extension in development, but is not ready for use in experiment development yet. So, in the meantime, we need to setup Resource Override to handle loading our harness for execution.

### Install Resource Override
Install from: https://chrome.google.com/webstore/detail/resource-override/pkoacgokdfckfpndoffpifphamojphii?hl=en

### Tab Group
Add tab group url for the path you want to load the variants into. You can use either a base url (https://www.verizon.com/**) or a specific path.

#### Add Change Header Rule

Use `Allow Outside Content` from the preset options and it should include two lines with:
`Remove` `Content-Security-Policy` and
`Remove` `X-Content-Security-Policy`

#### Add Inject file rule

Add an Inject file to your tab group and use the defaut `head` as the insertion point.
The following snippet should be used as the content.

```
var variants = ['planPage/c1/v1'];
var port = '8080';

var expScript = document.createElement('script');
expScript.setAttribute('src', `http://localhost:${port}/bootstrap.js`);
expScript.setAttribute('variants', JSON.stringify(variants));
expScript.setAttribute('port', port);

document.head.appendChild(expScript);
```

Note: The variants can be any combination where each variant string is specified by the following `<context id>/<concept id>/<variant id>`.


## Build Yaml file

```
npm run yaml:build
```

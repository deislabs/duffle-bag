# duffle-bag

A template for graphical user interfaces for working with CNAB bundles.

To run, `npm install` then `npm run dev`.

To package this as a standalone application, run `npm run package`.  If you want
to include Duffle binaries (so that the user doesn't need to have Duffle on their
system path), copy these into the relevant `dufflebin` directory before packaging.
(The duffle-coat extension for VS Code does this automatically, though you may
still want to do it manually if you need to upgrade the embedded Duffle binaries.)

# Creating an installer

The easiest way to create an installer from this template is to use the duffle-cost
extension for VS Code.  Right-click a bundle and choose `Generate Self-Installer`.

To hand author an installer, copy the templatem and copy your bundle (`bundle.json`,
and `bundle.cnab` if signed) into the `data` directory.

**Important!** If you are hand authoring a self-installer using this template, and
your bundle is signed, you _must also_ provide the JSON (unsigned) version.  (The
duffle-coat extension does this for you.  We hope to remove this requirement
before release.)

# Customizing the installer

The application generates most information dynamically from the included bundle
file (at `data/bundle.json`/`.cnab`). The duffle-coat extension writes your bundle data
to this file at code generation time.  You can modify some chrome (e.g. product
name, window title, etc.) via `package.json`, `app/package.json` and `app/app.html`.
Again the duffle-coat extension sets reasonable defaults where it can.

You can provide additional information to users via the following extension points,
without needing to edit the source code:

* **Front page text:** You can display text on the first page of the application
  by creating a file `data/description.html`.  If `data/description.html` exists then
  it takes precedence over any `description` field in the bundle.
* **Installation result page text:** You can display text after the installation
  has completed by creating `data/postinstall.succeeded.html` and/or
  `data/postinstall.failed.html`.  These will be shown in addition to the
  Duffle result or error, in the event of success or failure respectively.
  If you want only want a post-install message

HTML documents should contain one or more HTML elements, which the program will
insert into a `div`.  You do not need to provide a parent element yourself, and should
not include page-level tags such as `<html>` or `<body>`.

## Example of a front page text document

`data/description.html`

```html
<p>Welcome to the <b>helloworld</b> bundle.</p>
<p>Before installing this bundle, please have a nice cup of tea.</p>
```

# Acknowledgements

Based on [Alexander Rath's `electron-react-typescript-boilerplate` template](https://github.com/iRath96/electron-react-typescript-boilerplate).

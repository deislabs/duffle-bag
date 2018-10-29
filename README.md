# duffle-bag

A template for graphical user interfaces for working with CNAB bundles.

To run, `npm install` then `npm run dev`.

To package this as a standalone application, run `npm run package`.  If you want
to include Duffle binaries (so that the user doesn't need to have Duffle on their
system path), copy these into the relevant `dufflebin` directory before packaging.
(The duffle-coat extension for VS Code does this automatically, though you may
still want to do it manually if you need to upgrade the embedded Duffle binaries.)

# Acknowledgements

Based on [Alexander Rath's `electron-react-typescript-boilerplate` template](https://github.com/iRath96/electron-react-typescript-boilerplate).

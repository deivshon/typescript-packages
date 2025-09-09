This is a monorepo for a number of TypeScript packages, the basic structure is:

- ./configs <- base configuration files reused across multiple packages
- ./packages <- for individual, self contained packages
- ./test <- test applications to test one or more packages together

Each package is a pnpm workspace
Each package contains a `package.json` with a few scripts:

- typecheck <- runs the TypeScript type checker
- lint <- runs the linter
- test (optional) <- runs the unit tests

Whenever you make a change to the code, before finishing you should run the typecheck, lint and, if it exists, test scripts to ensure everything is working correctly. To run the typecheck script for the `store` package, for instance you would run `pnpm run -C ./packages/store/ typecheck`

const gulp = require('gulp');
const typedoc = require('gulp-typedoc');

gulp.task("default", ["typedoc"]);

gulp.task("typedoc", function () {
    gulp.src([
        "src/BuiltinSlotTypes.ts",
        "src/BuiltinUtterances.ts",
        "src/IIntentSchema.ts",
        "src/IModel.ts",
        "src/SampleUtterances.ts",
        "src/SlotTypes.ts",
        "src/Utterance.ts"
    ]).pipe(typedoc({
            // TypeScript options (see typescript docs)
            excludePrivate: true,
            excludeNotExported: true,
            excludeExternals: true,
            gaID: "UA-99287066-2",
            gaSite: "docs.bespoken.io",
            mode: "file",
            name: "Bespoken Virtual Core",
            readme: "README.md",
            target: "ES6",
            out: "docs/api",
            version: true
        })
    );
});

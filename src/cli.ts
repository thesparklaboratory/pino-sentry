#!/usr/bin/env node

import { program } from "commander";
import { createWriteStream } from "./transport.js";

function main() {
  program
    .option("-d, --dsn <dsn>", "Your Sentry DSN or Data Source Name")
    .option("-e, --environment <environment>", "Sentry environment")
    .option("-n, --serverName <serverName>", "Transport name")
    .option("-dm, --debug <debug>", "Turns debug mode on or off")
    .option(
      "-sr, --sampleRate <sampleRate>",
      "Sample rate as a percentage of events to be sent in the range of 0.0 to 1.0",
    )
    .option(
      "-mb, --maxBreadcrumbs <maxBreadcrumbs>",
      "Total amount of breadcrumbs that should be captured",
    )
    .option("-di, --dist <dist>", "Sets the distribution for all events")
    .option(
      "--maxValueLength <maxValueLength>",
      "Maximum number of chars a single value can have before it will be truncated.",
    )
    .option(
      "--release <release>",
      "The release identifier used when uploading respective source maps.",
    )
    .option(
      "-l, --level <level>",
      "The minimum level for a log to be reported to Sentry",
    )
    .action(
      ({
        dsn,
        serverName,
        environment,
        debug,
        sampleRate,
        maxBreadcrumbs,
        dist,
        maxValueLength,
        release,
        level,
      }) => {
        try {
          const writeStream = createWriteStream({
            dsn,
            serverName,
            environment,
            debug,
            sampleRate,
            maxBreadcrumbs,
            dist,
            maxValueLength,
            release,
            level,
          });
          // Echo to stdout
          process.stdin.pipe(process.stdout);
          // Pipe to writeStream
          process.stdin.pipe(writeStream);
          // @tslint-disable-next-line no-console
          console.info("[pino-sentry] Logging Initialized");
        } catch (error) {
          // @tslint-disable-next-line no-console
          console.log("[pino-sentry]", error);
          process.exit(1);
        }
      },
    );

  program.parse(process.argv);
}

main();

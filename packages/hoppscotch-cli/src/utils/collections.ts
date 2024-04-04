import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import chalk from "chalk";
import { log } from "console";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import { round } from "lodash-es";

import { CollectionRunnerParam } from "../types/collections";
import {
  CollectionStack,
  HoppEnvs,
  ProcessRequestParams,
  RequestReport,
} from "../types/request";
import {
  PreRequestMetrics,
  RequestMetrics,
  TestMetrics,
} from "../types/response";
import { DEFAULT_DURATION_PRECISION } from "./constants";
import {
  printErrorsReport,
  printFailedTestsReport,
  printPreRequestMetrics,
  printRequestsMetrics,
  printTestsMetrics,
} from "./display";
import { exceptionColors } from "./getters";
import { getPreRequestMetrics } from "./pre-request";
import {
  getRequestMetrics,
  preProcessRequest,
  processRequest,
} from "./request";
import { getTestMetrics } from "./test";

const { WARN, FAIL } = exceptionColors;

/**
 * Processes each requests within collections to prints details of subsequent requests,
 * tests and to display complete errors-report, failed-tests-report and test-metrics.
 * @param param Data of hopp-collection with hopp-requests, envs to be processed.
 * @returns List of report for each processed request.
 */
export const collectionsRunner = async (
  param: CollectionRunnerParam
): Promise<RequestReport[]> => {
  const envs: HoppEnvs = param.envs;
  const delay = param.delay ?? 0;
  const requestsReport: RequestReport[] = [];
  const collectionStack: CollectionStack[] = getCollectionStack(
    param.collections
  );

  while (collectionStack.length) {
    // Pop out top-most collection from stack to be processed.
    const { collection, path } = <CollectionStack>collectionStack.pop();

      // Processing each request in collection
      for (const request of collection.requests) {
        const _request = preProcessRequest(request as HoppRESTRequest, collection);
        const requestPath = `${path}/${_request.name}`;
        const processRequestParams: ProcessRequestParams = {
          path: requestPath,
          request: _request,
          envs,
          delay,
        };

        // Request processing initiated message.
        log(WARN(`\nRunning: ${chalk.bold(requestPath)}`));

      // Processing current request.
      const result = await processRequest(processRequestParams)();

      // Updating global & selected envs with new envs from processed-request output.
      const { global, selected } = result.envs;
      envs.global = global;
      envs.selected = selected;

        // Storing current request's report.
        const requestReport = result.report;
        requestsReport.push(requestReport);
      }

      // Pushing remaining folders realted collection to stack.
      for (const folder of collection.folders) {
        const updatedFolder: HoppCollection = { ...folder }

        if (updatedFolder.auth?.authType === "inherit") {
          updatedFolder.auth = collection.auth;
        }

        if (collection.headers?.length) {
          // Filter out header entries present in the parent collection under the same name
          // This ensures the folder headers take precedence over the collection headers
          const filteredHeaders = collection.headers.filter((collectionHeaderEntries) => {
            return !updatedFolder.headers.some((folderHeaderEntries) => folderHeaderEntries.key === collectionHeaderEntries.key)
          })
          updatedFolder.headers.push(...filteredHeaders);
        }

        collectionStack.push({
          path: `${path}/${updatedFolder.name}`,
          collection: updatedFolder,
        });
      }
    }

  return requestsReport;
};

/**
 * Transforms collections to generate collection-stack which describes each collection's
 * path within collection & the collection itself.
 * @param collections Hopp-collection objects to be mapped to collection-stack type.
 * @returns Mapped collections to collection-stack.
 */
const getCollectionStack = (collections: HoppCollection[]): CollectionStack[] =>
  pipe(
    collections,
    A.map(
      (collection) => <CollectionStack>{ collection, path: collection.name }
    )
  );

/**
 * Prints collection-runner-report using test-metrics, request-metrics and
 * pre-request-metrics data in pretty-format.
 * @param requestsReport Provides data for each request-report which includes
 * path of each request within collection-json file, failed-tests-report, errors,
 * total execution duration for requests, pre-request-scripts, test-scripts.
 * @returns True, if collection runner executed without any errors or failed test-cases.
 * False, if errors occurred or test-cases failed.
 */
export const collectionsRunnerResult = (
  requestsReport: RequestReport[]
): boolean => {
  const overallTestMetrics = <TestMetrics>{
    tests: { failed: 0, passed: 0 },
    testSuites: { failed: 0, passed: 0 },
    duration: 0,
    scripts: { failed: 0, passed: 0 },
  };
  const overallRequestMetrics = <RequestMetrics>{
    requests: { failed: 0, passed: 0 },
    duration: 0,
  };
  const overallPreRequestMetrics = <PreRequestMetrics>{
    scripts: { failed: 0, passed: 0 },
    duration: 0,
  };
  let finalResult = true;

  // Printing requests-report details of failed-tests and errors
  for (const requestReport of requestsReport) {
    const { path, tests, errors, result, duration } = requestReport;
    const requestDuration = duration.request;
    const testsDuration = duration.test;
    const preRequestDuration = duration.preRequest;

    finalResult = finalResult && result;

    printFailedTestsReport(path, tests);

    printErrorsReport(path, errors);

    /**
     * Extracting current request report's test-metrics and updating
     * overall test-metrics.
     */
    const testMetrics = getTestMetrics(tests, testsDuration, errors);
    overallTestMetrics.duration += testMetrics.duration;
    overallTestMetrics.testSuites.failed += testMetrics.testSuites.failed;
    overallTestMetrics.testSuites.passed += testMetrics.testSuites.passed;
    overallTestMetrics.tests.failed += testMetrics.tests.failed;
    overallTestMetrics.tests.passed += testMetrics.tests.passed;
    overallTestMetrics.scripts.failed += testMetrics.scripts.failed;
    overallTestMetrics.scripts.passed += testMetrics.scripts.passed;

    /**
     * Extracting current request report's request-metrics and updating
     * overall request-metrics.
     */
    const requestMetrics = getRequestMetrics(errors, requestDuration);
    overallRequestMetrics.duration += requestMetrics.duration;
    overallRequestMetrics.requests.failed += requestMetrics.requests.failed;
    overallRequestMetrics.requests.passed += requestMetrics.requests.passed;

    /**
     * Extracting current request report's pre-request-metrics and updating
     * overall pre-request-metrics.
     */
    const preRequestMetrics = getPreRequestMetrics(errors, preRequestDuration);
    overallPreRequestMetrics.duration += preRequestMetrics.duration;
    overallPreRequestMetrics.scripts.failed += preRequestMetrics.scripts.failed;
    overallPreRequestMetrics.scripts.passed += preRequestMetrics.scripts.passed;
  }

  const testMetricsDuration = overallTestMetrics.duration;
  const requestMetricsDuration = overallRequestMetrics.duration;

  // Rounding-off overall test-metrics duration upto DEFAULT_DURATION_PRECISION.
  overallTestMetrics.duration = round(
    testMetricsDuration,
    DEFAULT_DURATION_PRECISION
  );

  // Rounding-off overall request-metrics duration upto DEFAULT_DURATION_PRECISION.
  overallRequestMetrics.duration = round(
    requestMetricsDuration,
    DEFAULT_DURATION_PRECISION
  );

  printTestsMetrics(overallTestMetrics);
  printRequestsMetrics(overallRequestMetrics);
  printPreRequestMetrics(overallPreRequestMetrics);

  return finalResult;
};

/**
 * Exiting hopp cli process with appropriate exit code depending on
 * collections-runner result.
 * If result is true, we exit the cli process with code 0.
 * Else, exit with code 1.
 * @param result Boolean defining the collections-runner result.
 */
export const collectionsRunnerExit = (result: boolean): never => {
  if (!result) {
    const EXIT_MSG = FAIL(`\nExited with code 1`);
    process.stderr.write(EXIT_MSG);
    process.exit(1);
  }
  process.exit(0);
};

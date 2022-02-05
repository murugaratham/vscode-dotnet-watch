/*
 * @file Contains the DotNetWatchDebugConfiguration.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-15 14:36:43
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-16 23:46:33
 */

import { DebugConfiguration, WorkspaceFolder } from "vscode";

/**
 * The DotNetWatchDebugConfiguration class, extends the vscode.DebugConfiguration
 *
 * @export
 * @interface DotNetWatchDebugConfiguration
 * @extends {DebugConfiguration}
 */
export default interface IDotNetWatchDebugConfiguration extends DebugConfiguration {
  /**
   * The workspace of the debug session.
   *
   * @type {WorkspaceFolder}
   * @memberof IDotNetWatchDebugConfiguration
   */
  workspace: WorkspaceFolder;

  /**
   * The arguments for the application of the debug session.
   *
   * @type {Array<string>}
   * @memberof IDotNetWatchDebugConfiguration
   */
  args: Array<string>;

  /**
   * The environment variables of the debug session.
   *
   * @type {{ [key: string]: string }}
   * @memberof IDotNetWatchDebugConfiguration
   */
  env?: { [key: string]: string };

  /**
   * The project name of the application of the debug session.
   *
   * @type {string}
   * @memberof IDotNetWatchDebugConfiguration
   */
  project: string;
}

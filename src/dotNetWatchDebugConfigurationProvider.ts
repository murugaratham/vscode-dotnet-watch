/*
 * @file Contains the DotNetWatchDebugConfigurationProvider.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2019-02-16 22:01:33
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-19 13:51:15
 */

import { DebugConfiguration, DebugConfigurationProvider, ProviderResult, workspace, WorkspaceFolder } from "vscode";
import DotNetWatch from "./dotNetWatch";
import IDotNetWatchDebugConfiguration from "./interfaces/IDotNetWatchDebugConfiguration";

/**
 * The DotNetWatchDebugConfigurationProvider.
 *
 * @export
 * @class DotNetWatchDebugConfigurationProvider
 * @implements {DebugConfigurationProvider}
 */
export default class DotNetWatchDebugConfigurationProvider implements DebugConfigurationProvider {
  /**
   * Get the default DebugConfiguration for DotNetWatch.
   *
   * @private
   * @static
   * @returns {DebugConfiguration}
   * @memberof DotNetWatchDebugConfigurationProvider
   */
  private static GetDefaultDotNetWatchDebugConfig(project?: string): DebugConfiguration {
    const defaultConfig: DebugConfiguration = {
      type: "DotNetWatch",
      request: "launch",
      name: ".NET Core Watch",
      env: {
        ASPNETCORE_ENVIRONMENT: "Development",
        //wait for this pr: https://github.com/dotnet/sdk/pull/23280/files
        DOTNET_WATCH_RESTART_ON_RUDE_EDIT: "true",
      },
    };

    if (project && 0 !== project.length) {
      defaultConfig.project = `${project}.csproj`;
      defaultConfig.name += `: ${project}`;
    }

    return defaultConfig;
  }

  /**
   * Resolves a [debug configuration](#DebugConfiguration) by filling in missing values or by adding/changing/removing attributes.
   * If more than one debug configuration provider is registered for the same type, the resolveDebugConfiguration calls are chained
   * in arbitrary order and the initial debug configuration is piped through the chain.
   * Returning the value 'undefined' prevents the debug session from starting.
   *
   * @param folder The workspace folder from which the configuration originates from or undefined for a folderless setup.
   * @param debugConfiguration The [debug configuration](#DebugConfiguration) to resolve.
   * @param token A cancellation token.
   * @return The resolved debug configuration or undefined.
   */
  public resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    debugConfiguration: IDotNetWatchDebugConfiguration
  ): ProviderResult<IDotNetWatchDebugConfiguration> {
    if (debugConfiguration.env) {
      debugConfiguration.env["DOTNET_WATCH_RESTART_ON_RUDE_EDIT"] = "true";
    }

    //provide default args if undefined
    if (!debugConfiguration.args) {
      debugConfiguration.args = [];
    }

    if (!debugConfiguration.type) {
      // If the config doesn't look functional force VSCode to open a configuration file https://github.com/Microsoft/vscode/issues/54213
      return null;
    }

    if (folder) {
      debugConfiguration.workspace = folder;
      DotNetWatch.TaskService.StartDotNetWatchTask(debugConfiguration);
    }
    return undefined;
  }

  /**
   * Provides initial [debug configuration](#DebugConfiguration). If more than one debug configuration provider is
   * registered for the same type, debug configurations are concatenated in arbitrary order.
   * @param {(WorkspaceFolder | undefined)} folder The workspace folder for which the configurations are used or `undefined` for a folderless setup.
   * @param {CancellationToken} [token] A cancellation token.
   * @returns {ProviderResult<IDotNetWatchDebugConfiguration[]>} An array of [debug configurations](#DebugConfiguration).
   * @memberof DotNetWatchDebugConfigurationProvider
   */
  public provideDebugConfigurations(
    folder: WorkspaceFolder | undefined
  ): ProviderResult<Array<IDotNetWatchDebugConfiguration>> {
    if (folder) {
      return Promise.resolve(
        workspace.findFiles("**/*.csproj").then(async (k) => {
          const tmp = k.filter((m) => m.toString().startsWith(folder.uri.toString()));
          if (tmp.length > 1) {
            return await DotNetWatch.UiService.OpenMultiSelectProjectQuickPick(tmp).then((m) => {
              if (m && m.length !== 0) {
                return m.map((o) =>
                  DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig(o.label)
                ) as Array<IDotNetWatchDebugConfiguration>;
              } else {
                return new Array<IDotNetWatchDebugConfiguration>(
                  DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration
                );
              }
            });
          } else {
            return new Array<IDotNetWatchDebugConfiguration>(
              DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration
            );
          }
        })
      );
    }
    return new Array<IDotNetWatchDebugConfiguration>(
      DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration
    );
  }
}

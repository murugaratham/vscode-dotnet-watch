/*
 * @file Contains the DotNetAutoAttachDebugConfigurationProvider.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2019-02-16 22:01:33
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-19 13:51:15
 */

import {
	CancellationToken,
	DebugConfiguration,
	DebugConfigurationProvider,
	ProviderResult,
	workspace,
	WorkspaceFolder
} from "vscode";
import DotNetAutoAttach from "./dotNetAutoAttach";
import IDotNetAutoAttachDebugConfiguration from "./interfaces/IDotNetAutoAttachDebugConfiguration";

/**
 * The DotNetAutoAttachDebugConfigurationProvider.
 *
 * @export
 * @class DotNetAutoAttachDebugConfigurationProvider
 * @implements {DebugConfigurationProvider}
 */
export default class DotNetAutoAttachDebugConfigurationProvider
	implements DebugConfigurationProvider {

	/**
	 * Get the default DebugConfiguration for DotNetAutoAttach.
	 *
	 * @private
	 * @static
	 * @returns {DebugConfiguration}
	 * @memberof DotNetAutoAttachDebugConfigurationProvider
	 */
	private static GetDefaultDotNetAutoAttachDebugConfig(project?: string): DebugConfiguration {
		var defaultConfig: DebugConfiguration = {
			type: "DotNetAutoAttach",
			request: "launch",
			name: ".NET Core Watch",
			args: [],
			env: {
				"ASPNETCORE_ENVIRONMENT": "Development"
			}
		};

		if (project && 0 !== project.length) {
			defaultConfig.project = project;
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
		debugConfiguration: IDotNetAutoAttachDebugConfiguration,
		token?: CancellationToken
	): ProviderResult<IDotNetAutoAttachDebugConfiguration> {
		if (!debugConfiguration.type) {
			// If the config doesn't look functional force VSCode to open a configuration file https://github.com/Microsoft/vscode/issues/54213
			return null;
		}

		if (folder) {
			debugConfiguration.workspace = folder;
			DotNetAutoAttach.TaskService.StartDotNetWatchTask(debugConfiguration);
		}
		return undefined;
	}

	/**
	 * Provides initial [debug configuration](#DebugConfiguration). If more than one debug configuration provider is
	 * registered for the same type, debug configurations are concatenated in arbitrary order.
	 * @param {(WorkspaceFolder | undefined)} folder The workspace folder for which the configurations are used or `undefined` for a folderless setup.
	 * @param {CancellationToken} [token] A cancellation token.
	 * @returns {ProviderResult<IDotNetAutoAttachDebugConfiguration[]>} An array of [debug configurations](#DebugConfiguration).
	 * @memberof DotNetAutoAttachDebugConfigurationProvider
	 */
	public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<Array<IDotNetAutoAttachDebugConfiguration>> {
		if (folder) {
			return Promise.resolve(
				workspace.findFiles("**/*.csproj").then(k => {
					var tmp = k.filter(m =>
						m.toString().startsWith(folder.uri.toString())
					);
					if (tmp.length > 1) {
						return DotNetAutoAttach.UiService.OpenMultiSelectProjectQuickPick(tmp).then(m => {
							if (m && m.length !== 0) {
								return m.map(o => DotNetAutoAttachDebugConfigurationProvider.GetDefaultDotNetAutoAttachDebugConfig(o.label)) as Array<IDotNetAutoAttachDebugConfiguration>;
							}
							else {
								return new Array<IDotNetAutoAttachDebugConfiguration>(DotNetAutoAttachDebugConfigurationProvider.GetDefaultDotNetAutoAttachDebugConfig() as IDotNetAutoAttachDebugConfiguration);
							}
						});
					} else {
						return new Array<IDotNetAutoAttachDebugConfiguration>(DotNetAutoAttachDebugConfigurationProvider.GetDefaultDotNetAutoAttachDebugConfig() as IDotNetAutoAttachDebugConfiguration);
					}
				}));
		}
		return new Array<IDotNetAutoAttachDebugConfiguration>(DotNetAutoAttachDebugConfigurationProvider.GetDefaultDotNetAutoAttachDebugConfig() as IDotNetAutoAttachDebugConfiguration);

	}
}

/*
 * @file Contains the UiService.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2019-02-02 10:33:23
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-23 14:54:41
 */

import { Disposable, QuickPickOptions, Uri, window } from "vscode";
import { DebugDisconnectedEnum } from "../enums/DebugDisconnectedEnum";
import DotNetAutoAttachDebugConfiguration from "../interfaces/IDotNetAutoAttachDebugConfiguration";
import LaunchProfileQuickPickItem from "../models/LaunchProfileQuickPickItem";
import ProjectQuickPickItem from "../models/ProjectQuickPickItem";

/**
 * The UiService, proviedes functions for ui actions.
 *
 * @export
 * @class UiService
 */
export default class UiService implements Disposable {
  /**
   * Opens a Project Quick Pick.
   *
   * @private
   * @param {Uri[]} uris
   * @returns {(Thenable<ProjectQuickPickItem | undefined>)}
   * @memberof TaskService
   */
  public OpenProjectQuickPick(uris: Array<Uri>): Thenable<ProjectQuickPickItem | undefined> {
    const quickPickOptions: QuickPickOptions = {
      canPickMany: false,
      placeHolder: "Select the project to launch the DotNet Watch task for.",
      matchOnDescription: true,
      matchOnDetail: true,
    };
    return window.showQuickPick(
      uris.map((k) => new ProjectQuickPickItem(k)),
      quickPickOptions
    );
  }

  /**
   * Opens a MultiSelectProject QuickPick.
   *
   * @param {Array<Uri>} uris
   * @returns {(Thenable<Array<ProjectQuickPickItem>| undefined>)}
   * @memberof UiService
   */
  public OpenMultiSelectProjectQuickPick(uris: Array<Uri>): Thenable<Array<ProjectQuickPickItem> | undefined> {
    return window.showQuickPick(
      uris.map((k) => new ProjectQuickPickItem(k)),
      {
        canPickMany: true,
        placeHolder: "Select the projects you want to add to launch.json.",
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );
  }

  /**
   * Opens a Debug Disconnected Information Message.
   *
   * @param {string} projectName
   * @param {number} processId
   * @returns {(Thenable<string | undefined>)}
   * @memberof UiService
   */
  public DebugDisconnectedInformationMessage(projectName: string, processId: number): Thenable<DebugDisconnectedEnum> {
    return window
      .showInformationMessage(
        `Debug disconnected. Reattach to ${projectName} (${processId}) ?`,
        "Yes",
        "No",
        "Stop watch task"
      )
      .then((ret) => {
        switch (ret) {
          case "Yes":
            return DebugDisconnectedEnum.Yes;
            break;
          case "Stop watch task":
            return DebugDisconnectedEnum.Stop;
            break;
          default:
            return DebugDisconnectedEnum.No;
            break;
        }
      });
  }

  /**
   * Opens a Task already started Information Message.
   *
   * @param {string} projectName
   * @returns {(Thenable<string | undefined>)}
   * @memberof UiService
   */
  public TaskAlreadyStartedInformationMessage(projectName: string): Thenable<string | undefined> {
    return window.showInformationMessage(`.NET Watch Task already started for the project  ${projectName}.`);
  }

  /**
   * Opens a ProjectDoesNotExist Error Message.
   *
   * @param {string} project
   * @returns {(Thenable<string | undefined>)}
   * @memberof UiService
   */
  public ProjectDoesNotExistErrorMessage(debugConfig: DotNetAutoAttachDebugConfiguration): Thenable<boolean> {
    return window
      .showErrorMessage(
        `The debug configuration '${debugConfig.name}' within the launch.json references a project that cannot be found or is not unique (${debugConfig.project}).`,
        "Open launch.json"
      )
      .then((value) => {
        if (value && value === "Open launch.json") {
          return true;
        } else {
          return false;
        }
      });
  }

  /**
   * Opens a Project Quick Pick.
   *
   * @private
   * @param {Uri[]} profiles
   * @returns {(Thenable<LaunchProfileQuickPickItem | undefined>)}
   * @memberof TaskService
   */
  public OpenLaunchProfileQuickPick(
    projectName: string,
    profiles: Array<string>
  ): Thenable<LaunchProfileQuickPickItem | undefined> {
    const quickPickOptions: QuickPickOptions = {
      canPickMany: false,
      placeHolder: `[${projectName}] Which launch profile? (loads environment variables)`,
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: true,
    };
    return window.showQuickPick(
      profiles.map((k) => new LaunchProfileQuickPickItem(k)),
      quickPickOptions
    );
    // const quickPick = window.createQuickPick();

    // quickPick.items = profiles.map((k) => new LaunchProfileQuickPickItem(k));
    // quickPick.canSelectMany = false;
    // quickPick.placeholder = `[${projectName}] Which launch profile? (loads environment variables)`;
    // quickPick.matchOnDescription = true;
    // quickPick.matchOnDetail = true;
    // quickPick.show();
    // quickPick.onDidChangeSelection((selection) => {
    //   if (selection) quickPick.hide();
    // });
    // return new Promise<LaunchProfileQuickPickItem | undefined>((resolve) =>
    //   quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]))
    // );
  }

  /**
   * Opens a ProjectDoesNotExist Error Message.
   *
   * @param {string} project
   * @returns {(Thenable<string | undefined>)}
   * @memberof UiService
   */
  public GenericErrorMessage(err: string) {
    return window.showErrorMessage(err);
  }

  /**
   * Dispose.
   *
   * @memberof UiService
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public dispose() {}
}

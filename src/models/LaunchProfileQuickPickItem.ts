/*
 * @file Contains the ProjectQuickPickItem
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-15 16:42:53
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2018-06-15 16:43:29
 */

import { QuickPickItem } from "vscode";

/**
 * The ProjectQuickPickItem. Represents Project that can be selected from
 * a list of projects.
 *
 * @export
 * @class ProjectQuickPickItem
 * @implements {QuickPickItem}
 */
export default class LaunchProfileQuickPickItem implements QuickPickItem {
  /**
   * Creates an instance of LaunchProfileQuickPickItem.
   * @param {string} label
   * @memberof LaunchProfileQuickPickItem
   */
  public constructor(profileName: string) {
    this.label = profileName;
  }
  /**
   * A human readable string which is rendered prominent.
   */
  public label = "";

  /**
   * Optional flag indicating if this item is picked initially.
   * (Only honored when the picker allows multiple selections.)
   *
   * @see [QuickPickOptions.canPickMany](#QuickPickOptions.canPickMany)
   */
  public picked?: boolean;
}

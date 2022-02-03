/*
 * @file Contains the ProjectQuickPickItem
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-15 16:42:53
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2018-06-15 16:43:29
 */

import { QuickPickItem, Uri } from "vscode";

/**
 * The ProjectQuickPickItem. Represents Project that can be selected from
 * a list of projects.
 *
 * @export
 * @class ProjectQuickPickItem
 * @implements {QuickPickItem}
 */
export default class ProjectQuickPickItem implements QuickPickItem {
	/**
	 * Creates an instance of ProjectQuickPickItem.
	 * @param {Uri} uri
	 * @memberof ProjectQuickPickItem
	 */
	public constructor(uri: Uri) {
		const name_regex = /^.+(\/|\\)(.+).csproj/;
		let matches = name_regex.exec(uri.fsPath);
		if (matches && matches.length === 3) {
			this.label = matches[2];
		}
		this.detail = uri.fsPath;
		this.uri = uri;
	}
	/**
	 * A human readable string which is rendered prominent.
	 */
	public label: string = "";

	/**
	 * A human readable string which is rendered less prominent.
	 */
	public description?: string;

	/**
	 * A human readable string which is rendered less prominent.
	 */
	public detail?: string;

	/**
	 * Optional flag indicating if this item is picked initially.
	 * (Only honored when the picker allows multiple selections.)
	 *
	 * @see [QuickPickOptions.canPickMany](#QuickPickOptions.canPickMany)
	 */
	public picked?: boolean;
	/**
	 * The Uri of the Project which is not rendered.
	 *
	 * @type {Uri}
	 * @memberof ProjectQuickPickItem
	 */
	public readonly uri: Uri;
}

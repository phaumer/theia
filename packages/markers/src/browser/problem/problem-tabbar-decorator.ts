/********************************************************************************
 * Copyright (C) 2019 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { inject, injectable, postConstruct } from 'inversify';
import { Diagnostic } from 'vscode-languageserver-types';
import { Event, Emitter } from '@theia/core/lib/common/event';
import { Title, Widget } from '@phosphor/widgets';
import { WidgetDecoration } from '@theia/core/lib/browser/widget-decoration';
import { TabBarDecorator } from '@theia/core/lib/browser/shell/tab-bar-decorator';
import { Marker } from '../../common/marker';
import { ProblemManager } from './problem-manager';
import { ProblemPreferences, ProblemConfiguration } from './problem-preferences';
import { PreferenceChangeEvent, Navigatable } from '@theia/core/lib/browser';

@injectable()
export class ProblemTabBarDecorator implements TabBarDecorator {

    readonly id = 'theia-problem-tabbar-decorator';

    protected readonly emitter = new Emitter<void>();

    @inject(ProblemPreferences)
    protected readonly preferences: ProblemPreferences;

    @inject(ProblemManager)
    protected readonly problemManager: ProblemManager;

    @postConstruct()
    protected init(): void {
        this.problemManager.onDidChangeMarkers(() => this.fireDidChangeDecorations());
        this.preferences.onPreferenceChanged(event => this.handlePreferenceChange(event));
    }

    decorate(title: Title<Widget>): WidgetDecoration.Data[] {
        const widget = title.owner;
        if (Navigatable.is(widget)) {
            const resourceUri = widget.getResourceUri();
            if (resourceUri) {
                return this.problemManager.findMarkers({
                    uri: resourceUri
                }).map(marker => this.toDecorator(marker));
            }
        }
        return [];
    }

    get onDidChangeDecorations(): Event<void> {
        return this.emitter.event;
    }

    protected fireDidChangeDecorations(): void {
        this.emitter.fire(undefined);
    }

    /**
     * Handle changes in preference.
     * @param {PreferenceChangeEvent<ProblemConfiguration>} event The event of the changes in preference.
     */
    protected async handlePreferenceChange(event: PreferenceChangeEvent<ProblemConfiguration>): Promise<void> {
        const { preferenceName } = event;
        if (preferenceName === 'problems.decorations.tabbar.enabled') {
            this.fireDidChangeDecorations();
        }
    }

    /**
     * Convert a diagnostic marker to a decorator.
     * @param {Marker<Diagnostic>} marker A diagnostic marker.
     * @returns {WidgetDecoration.Data} The decoration data.
     */
    protected toDecorator(marker: Marker<Diagnostic>): WidgetDecoration.Data {
        const position = WidgetDecoration.IconOverlayPosition.BOTTOM_RIGHT;
        const icon = this.getOverlayIcon(marker);
        const color = this.getOverlayIconColor(marker);
        return {
            iconOverlay: {
                position,
                icon,
                color,
                background: {
                    shape: 'circle',
                    color: 'var(--theia-layout-color0)'
                }
            }
        };
    }

    /**
     * Get the appropriate overlay icon for decoration.
     * @param {Marker<Diagnostic>} marker A diagnostic marker.
     * @returns {string} A string representing the overlay icon class.
     */
    protected getOverlayIcon(marker: Marker<Diagnostic>): string {
        const { severity } = marker.data;
        switch (severity) {
            case 1: return 'times-circle';
            case 2: return 'exclamation-circle';
            case 3: return 'info-circle';
            default: return 'hand-o-up';
        }
    }

    /**
     * Get the appropriate overlay icon color for decoration.
     * @param {Marker<Diagnostic>} marker A diagnostic marker.
     * @returns {WidgetDecoration.Color} The decoration color.
     */
    protected getOverlayIconColor(marker: Marker<Diagnostic>): WidgetDecoration.Color {
        const { severity } = marker.data;
        switch (severity) {
            case 1: return 'var(--theia-error-color0)';
            case 2: return 'var(--theia-warn-color0)';
            case 3: return 'var(--theia-info-color0)';
            default: return 'var(--theia-success-color0)';
        }
    }

}

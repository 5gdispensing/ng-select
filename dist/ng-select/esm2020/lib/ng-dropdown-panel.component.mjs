import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostBinding, HostListener, Inject, Input, Optional, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { animationFrameScheduler, asapScheduler, fromEvent, merge, Subject } from 'rxjs';
import { auditTime, takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { isDefined } from './value-utils';
import * as i0 from "@angular/core";
import * as i1 from "./ng-dropdown-panel.service";
import * as i2 from "@angular/common";
const CSS_POSITIONS = ['top', 'right', 'bottom', 'left'];
const SCROLL_SCHEDULER = typeof requestAnimationFrame !== 'undefined' ? animationFrameScheduler : asapScheduler;
export class NgDropdownPanelComponent {
    constructor(_renderer, _zone, _panelService, _elementRef, _document) {
        this._renderer = _renderer;
        this._zone = _zone;
        this._panelService = _panelService;
        this._document = _document;
        this.items = [];
        this.position = 'auto';
        this.virtualScroll = false;
        this.filterValue = null;
        this.dynamicWidth = false;
        this.update = new EventEmitter();
        this.scroll = new EventEmitter();
        this.scrollToEnd = new EventEmitter();
        this.outsideClick = new EventEmitter();
        this._destroy$ = new Subject();
        this._scrollToEndFired = false;
        this._updateScrollHeight = false;
        this._lastScrollPosition = 0;
        this._dropdown = _elementRef.nativeElement;
    }
    get currentPosition() {
        return this._currentPosition;
    }
    get itemsLength() {
        return this._itemsLength;
    }
    set itemsLength(value) {
        if (value !== this._itemsLength) {
            this._itemsLength = value;
            this._onItemsLengthChanged();
        }
    }
    get _startOffset() {
        if (this.markedItem) {
            const { itemHeight, panelHeight } = this._panelService.dimensions;
            const visibleIndex = _.indexOf(this.items, this.markedItem);
            const offset = visibleIndex * itemHeight;
            return panelHeight > offset ? 0 : offset;
        }
        return 0;
    }
    // calculate panel width depends on items labels lengths
    get panelWidth() {
        if (this.dynamicWidth) {
            const maxLabel = _.max(_.map(this.items, i => _.size(i.label)));
            return `${50 + maxLabel * 9}px !important`;
        }
        // don't use dynamic width
        return '';
    }
    handleMousedown($event) {
        const target = $event.target;
        if (target.tagName === 'INPUT') {
            return;
        }
        $event.preventDefault();
    }
    ngOnInit() {
        this._select = this._dropdown.parentElement;
        this._virtualPadding = this.paddingElementRef.nativeElement;
        this._scrollablePanel = this.scrollElementRef.nativeElement;
        this._contentPanel = this.contentElementRef.nativeElement;
        this._handleScroll();
        this._handleOutsideClick();
        this._appendDropdown();
        this._setupMousedownListener();
        // scroll to first marked item on dropdown opening
        this.scrollTo(this.markedItem);
    }
    ngOnChanges(changes) {
        if (changes.items) {
            const change = changes.items;
            this._onItemsChange(change.currentValue, change.firstChange);
        }
    }
    ngOnDestroy() {
        this._destroy$.next();
        this._destroy$.complete();
        this._destroy$.unsubscribe();
        if (this.appendTo) {
            this._renderer.removeChild(this._dropdown.parentNode, this._dropdown);
        }
    }
    scrollTo(option, startFromOption = false) {
        if (!option) {
            return;
        }
        const index = this.items.indexOf(option);
        if (index < 0 || index >= this.itemsLength) {
            return;
        }
        let scrollTo;
        if (this.virtualScroll) {
            const itemHeight = this._panelService.dimensions.itemHeight;
            scrollTo = this._panelService.getScrollTo(index * itemHeight, itemHeight, this._lastScrollPosition);
        }
        else {
            const item = this._dropdown.querySelector(`#${option.htmlId}`);
            const lastScroll = startFromOption ? item.offsetTop : this._lastScrollPosition;
            scrollTo = this._panelService.getScrollTo(item?.offsetTop || 0, item?.clientHeight || 36, lastScroll);
        }
        if (isDefined(scrollTo)) {
            this._scrollablePanel.scrollTop = scrollTo;
        }
    }
    scrollToTag() {
        const panel = this._scrollablePanel;
        panel.scrollTop = panel.scrollHeight - panel.clientHeight;
    }
    adjustPosition() {
        this._updateYPosition();
    }
    _handleDropdownPosition() {
        this._currentPosition = this._calculateCurrentPosition(this._dropdown);
        if (CSS_POSITIONS.includes(this._currentPosition)) {
            this._updateDropdownClass(this._currentPosition);
        }
        else {
            this._updateDropdownClass('bottom');
        }
        if (this.appendTo) {
            this._updateYPosition();
        }
        this._dropdown.style.opacity = '1';
    }
    _updateDropdownClass(currentPosition) {
        CSS_POSITIONS.forEach((position) => {
            const REMOVE_CSS_CLASS = `ng-select-${position}`;
            this._renderer.removeClass(this._dropdown, REMOVE_CSS_CLASS);
            this._renderer.removeClass(this._select, REMOVE_CSS_CLASS);
        });
        const ADD_CSS_CLASS = `ng-select-${currentPosition}`;
        this._renderer.addClass(this._dropdown, ADD_CSS_CLASS);
        this._renderer.addClass(this._select, ADD_CSS_CLASS);
    }
    _handleScroll() {
        this._zone.runOutsideAngular(() => {
            fromEvent(this.scrollElementRef.nativeElement, 'scroll')
                .pipe(takeUntil(this._destroy$), auditTime(0, SCROLL_SCHEDULER))
                .subscribe((e) => {
                const path = e.path || (e.composedPath && e.composedPath());
                const scrollTop = !path || path.length === 0 ? e.target.scrollTop : path[0].scrollTop;
                this._onContentScrolled(scrollTop);
            });
        });
    }
    _handleOutsideClick() {
        if (!this._document) {
            return;
        }
        this._zone.runOutsideAngular(() => {
            merge(fromEvent(this._document, 'touchstart', { capture: true }), fromEvent(this._document, 'mousedown', { capture: true })).pipe(takeUntil(this._destroy$))
                .subscribe($event => this._checkToClose($event));
        });
    }
    _checkToClose($event) {
        if (this._select.contains($event.target) || this._dropdown.contains($event.target)) {
            return;
        }
        const path = $event.path || ($event.composedPath && $event.composedPath());
        if ($event.target && $event.target.shadowRoot && path && path[0] && this._select.contains(path[0])) {
            return;
        }
        this._zone.run(() => this.outsideClick.emit());
    }
    _onItemsChange(items, firstChange) {
        this.items = items || [];
        this._scrollToEndFired = false;
        this.itemsLength = items.length;
        if (this.virtualScroll) {
            this._updateItemsRange(firstChange);
        }
        else {
            this._setVirtualHeight();
            this._updateItems(firstChange);
        }
    }
    _updateItems(firstChange) {
        this.update.emit(this.items);
        if (firstChange === false) {
            return;
        }
        this._zone.runOutsideAngular(() => {
            Promise.resolve().then(() => {
                const panelHeight = this._scrollablePanel.clientHeight;
                this._panelService.setDimensions(0, panelHeight);
                this._handleDropdownPosition();
                this.scrollTo(this.markedItem, firstChange);
            });
        });
    }
    _updateItemsRange(firstChange) {
        this._zone.runOutsideAngular(() => {
            this._measureDimensions().then(() => {
                if (firstChange) {
                    this._renderItemsRange(this._startOffset);
                    this._handleDropdownPosition();
                }
                else {
                    this._renderItemsRange();
                }
            });
        });
    }
    _onContentScrolled(scrollTop) {
        if (this.virtualScroll) {
            this._renderItemsRange(scrollTop);
        }
        this._lastScrollPosition = scrollTop;
        this._fireScrollToEnd(scrollTop);
    }
    _updateVirtualHeight(height) {
        if (this._updateScrollHeight) {
            this._virtualPadding.style.height = `${height}px`;
            this._updateScrollHeight = false;
        }
    }
    _setVirtualHeight() {
        if (!this._virtualPadding) {
            return;
        }
        this._virtualPadding.style.height = `0px`;
    }
    _onItemsLengthChanged() {
        this._updateScrollHeight = true;
    }
    _renderItemsRange(scrollTop = null) {
        if (scrollTop && this._lastScrollPosition === scrollTop) {
            return;
        }
        scrollTop = scrollTop || this._scrollablePanel.scrollTop;
        const range = this._panelService.calculateItems(scrollTop, this.itemsLength, this.bufferAmount);
        this._updateVirtualHeight(range.scrollHeight);
        this._contentPanel.style.transform = `translateY(${range.topPadding}px)`;
        this._zone.run(() => {
            this.update.emit(this.items.slice(range.start, range.end));
            this.scroll.emit({ start: range.start, end: range.end });
        });
        if (isDefined(scrollTop) && this._lastScrollPosition === 0) {
            this._scrollablePanel.scrollTop = scrollTop;
            this._lastScrollPosition = scrollTop;
        }
    }
    _measureDimensions() {
        if (this._panelService.dimensions.itemHeight > 0 || this.itemsLength === 0) {
            return Promise.resolve(this._panelService.dimensions);
        }
        const [first] = this.items;
        this.update.emit([first]);
        return Promise.resolve().then(() => {
            const option = this._dropdown.querySelector(`#${first.htmlId}`);
            const optionHeight = option.clientHeight;
            this._virtualPadding.style.height = `${optionHeight * this.itemsLength}px`;
            const panelHeight = this._scrollablePanel.clientHeight;
            this._panelService.setDimensions(optionHeight, panelHeight);
            return this._panelService.dimensions;
        });
    }
    _fireScrollToEnd(scrollTop) {
        if (this._scrollToEndFired || scrollTop === 0) {
            return;
        }
        const padding = this.virtualScroll ?
            this._virtualPadding :
            this._contentPanel;
        if (scrollTop + this._dropdown.clientHeight >= padding.clientHeight - 1) {
            this._zone.run(() => this.scrollToEnd.emit());
            this._scrollToEndFired = true;
        }
    }
    _calculateCurrentPosition(dropdownEl) {
        if (this.position !== 'auto') {
            return this.position;
        }
        const selectRect = this._select.getBoundingClientRect();
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const offsetTop = selectRect.top + window.pageYOffset;
        const height = selectRect.height;
        const dropdownHeight = dropdownEl.getBoundingClientRect().height;
        if (offsetTop + height + dropdownHeight > scrollTop + document.documentElement.clientHeight) {
            return 'top';
        }
        else {
            return 'bottom';
        }
    }
    _appendDropdown() {
        if (!this.appendTo) {
            return;
        }
        this._parent = document.querySelector(this.appendTo);
        if (!this._parent) {
            throw new Error(`appendTo selector ${this.appendTo} did not found any parent element`);
        }
        this._updateXPosition();
        this._parent.appendChild(this._dropdown);
    }
    _updateXPosition() {
        const select = this._select.getBoundingClientRect();
        const parent = this._parent.getBoundingClientRect();
        const offsetLeft = select.left - parent.left;
        this._dropdown.style.left = offsetLeft + 'px';
        this._dropdown.style.width = select.width + 'px';
        this._dropdown.style.minWidth = select.width + 'px';
    }
    _updateYPosition() {
        const select = this._select.getBoundingClientRect();
        const parent = this._parent.getBoundingClientRect();
        const delta = select.height;
        if (this._currentPosition === 'top') {
            const offsetBottom = parent.bottom - select.bottom;
            this._dropdown.style.bottom = offsetBottom + delta + 'px';
            this._dropdown.style.top = 'auto';
        }
        else if (this._currentPosition === 'bottom') {
            const offsetTop = select.top - parent.top;
            this._dropdown.style.top = offsetTop + delta + 'px';
            this._dropdown.style.bottom = 'auto';
        }
    }
    _setupMousedownListener() {
        this._zone.runOutsideAngular(() => {
            fromEvent(this._dropdown, 'mousedown')
                .pipe(takeUntil(this._destroy$))
                .subscribe((event) => {
                const target = event.target;
                if (target.tagName === 'INPUT') {
                    return;
                }
                event.preventDefault();
            });
        });
    }
}
NgDropdownPanelComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0", ngImport: i0, type: NgDropdownPanelComponent, deps: [{ token: i0.Renderer2 }, { token: i0.NgZone }, { token: i1.NgDropdownPanelService }, { token: i0.ElementRef }, { token: DOCUMENT, optional: true }], target: i0.ɵɵFactoryTarget.Component });
NgDropdownPanelComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "14.0.0", type: NgDropdownPanelComponent, selector: "ng-dropdown-panel", inputs: { items: "items", markedItem: "markedItem", position: "position", appendTo: "appendTo", bufferAmount: "bufferAmount", virtualScroll: "virtualScroll", headerSearchTemplate: "headerSearchTemplate", headerTemplate: "headerTemplate", footerTemplate: "footerTemplate", filterValue: "filterValue", dynamicWidth: "dynamicWidth" }, outputs: { update: "update", scroll: "scroll", scrollToEnd: "scrollToEnd", outsideClick: "outsideClick" }, host: { listeners: { "mousedown": "handleMousedown($event)" }, properties: { "style.width": "this.panelWidth" } }, viewQueries: [{ propertyName: "contentElementRef", first: true, predicate: ["content"], descendants: true, read: ElementRef, static: true }, { propertyName: "scrollElementRef", first: true, predicate: ["scroll"], descendants: true, read: ElementRef, static: true }, { propertyName: "paddingElementRef", first: true, predicate: ["padding"], descendants: true, read: ElementRef, static: true }], usesOnChanges: true, ngImport: i0, template: `
        <div *ngIf="headerTemplate || headerSearchTemplate" class="ng-dropdown-header">
            <ng-container [ngTemplateOutlet]="headerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
            <ng-container [ngTemplateOutlet]="headerSearchTemplate"></ng-container>
        </div>
        <div #scroll class="ng-dropdown-panel-items scroll-host">
            <div #padding [class.total-padding]="virtualScroll"></div>
            <div #content [class.scrollable-content]="virtualScroll && items.length">
                <ng-content></ng-content>
            </div>
        </div>
        <div *ngIf="footerTemplate" class="ng-dropdown-footer">
            <ng-container [ngTemplateOutlet]="footerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
        </div>
    `, isInline: true, dependencies: [{ kind: "directive", type: i2.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i2.NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0", ngImport: i0, type: NgDropdownPanelComponent, decorators: [{
            type: Component,
            args: [{
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None,
                    selector: 'ng-dropdown-panel',
                    template: `
        <div *ngIf="headerTemplate || headerSearchTemplate" class="ng-dropdown-header">
            <ng-container [ngTemplateOutlet]="headerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
            <ng-container [ngTemplateOutlet]="headerSearchTemplate"></ng-container>
        </div>
        <div #scroll class="ng-dropdown-panel-items scroll-host">
            <div #padding [class.total-padding]="virtualScroll"></div>
            <div #content [class.scrollable-content]="virtualScroll && items.length">
                <ng-content></ng-content>
            </div>
        </div>
        <div *ngIf="footerTemplate" class="ng-dropdown-footer">
            <ng-container [ngTemplateOutlet]="footerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
        </div>
    `
                }]
        }], ctorParameters: function () { return [{ type: i0.Renderer2 }, { type: i0.NgZone }, { type: i1.NgDropdownPanelService }, { type: i0.ElementRef }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [DOCUMENT]
                }] }]; }, propDecorators: { items: [{
                type: Input
            }], markedItem: [{
                type: Input
            }], position: [{
                type: Input
            }], appendTo: [{
                type: Input
            }], bufferAmount: [{
                type: Input
            }], virtualScroll: [{
                type: Input
            }], headerSearchTemplate: [{
                type: Input
            }], headerTemplate: [{
                type: Input
            }], footerTemplate: [{
                type: Input
            }], filterValue: [{
                type: Input
            }], dynamicWidth: [{
                type: Input
            }], update: [{
                type: Output
            }], scroll: [{
                type: Output
            }], scrollToEnd: [{
                type: Output
            }], outsideClick: [{
                type: Output
            }], contentElementRef: [{
                type: ViewChild,
                args: ['content', { read: ElementRef, static: true }]
            }], scrollElementRef: [{
                type: ViewChild,
                args: ['scroll', { read: ElementRef, static: true }]
            }], paddingElementRef: [{
                type: ViewChild,
                args: ['padding', { read: ElementRef, static: true }]
            }], panelWidth: [{
                type: HostBinding,
                args: ['style.width']
            }], handleMousedown: [{
                type: HostListener,
                args: ['mousedown', ['$event']]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctZHJvcGRvd24tcGFuZWwuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL25nLXNlbGVjdC9saWIvbmctZHJvcGRvd24tcGFuZWwuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQ0gsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsWUFBWSxFQUNaLFdBQVcsRUFDWCxZQUFZLEVBQ1osTUFBTSxFQUNOLEtBQUssRUFLTCxRQUFRLEVBQ1IsTUFBTSxFQUlOLFNBQVMsRUFDVCxpQkFBaUIsRUFDcEIsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUN6RixPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3RELE9BQU8sS0FBSyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBSzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUM7Ozs7QUFFMUMsTUFBTSxhQUFhLEdBQXVCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDN0UsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLHFCQUFxQixLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztBQXNCaEgsTUFBTSxPQUFPLHdCQUF3QjtJQWtDakMsWUFDWSxTQUFvQixFQUNwQixLQUFhLEVBQ2IsYUFBcUMsRUFDN0MsV0FBdUIsRUFDZSxTQUFjO1FBSjVDLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGtCQUFhLEdBQWIs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Z0JBQ0csTUFBTTtzQkFBZixNQUFNO2dCQUNHLFdBQVc7c0JBQXBCLE1BQU07Z0JBQ0csWUFBWTtzQkFBckIsTUFBTTtnQkFFbUQsaUJBQWlCO3NCQUExRSxTQUFTO3VCQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtnQkFDQyxnQkFBZ0I7c0JBQXhFLFNBQVM7dUJBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2dCQUNHLGlCQUFpQjtzQkFBMUUsU0FBUzt1QkFBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7Z0JBc0RwRCxVQUFVO3NCQURiLFdBQVc7dUJBQUMsYUFBYTtnQkFXMUIsZUFBZTtzQkFEZCxZQUFZO3VCQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERPQ1VNRU5UIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7XG4gICAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gICAgQ29tcG9uZW50LFxuICAgIEVsZW1lbnRSZWYsXG4gICAgRXZlbnRFbWl0dGVyLFxuICAgIEhvc3RCaW5kaW5nLFxuICAgIEhvc3RMaXN0ZW5lcixcbiAgICBJbmplY3QsXG4gICAgSW5wdXQsXG4gICAgTmdab25lLFxuICAgIE9uQ2hhbmdlcyxcbiAgICBPbkRlc3Ryb3ksXG4gICAgT25Jbml0LFxuICAgIE9wdGlvbmFsLFxuICAgIE91dHB1dCxcbiAgICBSZW5kZXJlcjIsXG4gICAgU2ltcGxlQ2hhbmdlcyxcbiAgICBUZW1wbGF0ZVJlZixcbiAgICBWaWV3Q2hpbGQsXG4gICAgVmlld0VuY2Fwc3VsYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBhbmltYXRpb25GcmFtZVNjaGVkdWxlciwgYXNhcFNjaGVkdWxlciwgZnJvbUV2ZW50LCBtZXJnZSwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgYXVkaXRUaW1lLCB0YWtlVW50aWwgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgeyBOZ0Ryb3Bkb3duUGFuZWxTZXJ2aWNlLCBQYW5lbERpbWVuc2lvbnMgfSBmcm9tICcuL25nLWRyb3Bkb3duLXBhbmVsLnNlcnZpY2UnO1xuXG5pbXBvcnQgeyBEcm9wZG93blBvc2l0aW9uIH0gZnJvbSAnLi9uZy1zZWxlY3QudHlwZXMnO1xuaW1wb3J0IHsgTmdPcHRpb24gfSBmcm9tICcuL25nLXNlbGVjdC50eXBlcyc7XG5pbXBvcnQgeyBpc0RlZmluZWQgfSBmcm9tICcuL3ZhbHVlLXV0aWxzJztcblxuY29uc3QgQ1NTX1BPU0lUSU9OUzogUmVhZG9ubHk8c3RyaW5nW10+ID0gWyd0b3AnLCAncmlnaHQnLCAnYm90dG9tJywgJ2xlZnQnXTtcbmNvbnN0IFNDUk9MTF9TQ0hFRFVMRVIgPSB0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lICE9PSAndW5kZWZpbmVkJyA/IGFuaW1hdGlvbkZyYW1lU2NoZWR1bGVyIDogYXNhcFNjaGVkdWxlcjtcblxuQENvbXBvbmVudCh7XG4gICAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gICAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgICBzZWxlY3RvcjogJ25nLWRyb3Bkb3duLXBhbmVsJyxcbiAgICB0ZW1wbGF0ZTogYFxuICAgICAgICA8ZGl2ICpuZ0lmPVwiaGVhZGVyVGVtcGxhdGUgfHwgaGVhZGVyU2VhcmNoVGVtcGxhdGVcIiBjbGFzcz1cIm5nLWRyb3Bkb3duLWhlYWRlclwiPlxuICAgICAgICAgICAgPG5nLWNvbnRhaW5lciBbbmdUZW1wbGF0ZU91dGxldF09XCJoZWFkZXJUZW1wbGF0ZVwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7IHNlYXJjaFRlcm06IGZpbHRlclZhbHVlIH1cIj48L25nLWNvbnRhaW5lcj5cbiAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwiaGVhZGVyU2VhcmNoVGVtcGxhdGVcIj48L25nLWNvbnRhaW5lcj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgI3Njcm9sbCBjbGFzcz1cIm5nLWRyb3Bkb3duLXBhbmVsLWl0ZW1zIHNjcm9sbC1ob3N0XCI+XG4gICAgICAgICAgICA8ZGl2ICNwYWRkaW5nIFtjbGFzcy50b3RhbC1wYWRkaW5nXT1cInZpcnR1YWxTY3JvbGxcIj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgI2NvbnRlbnQgW2NsYXNzLnNjcm9sbGFibGUtY29udGVudF09XCJ2aXJ0dWFsU2Nyb2xsICYmIGl0ZW1zLmxlbmd0aFwiPlxuICAgICAgICAgICAgICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiAqbmdJZj1cImZvb3RlclRlbXBsYXRlXCIgY2xhc3M9XCJuZy1kcm9wZG93bi1mb290ZXJcIj5cbiAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwiZm9vdGVyVGVtcGxhdGVcIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyBzZWFyY2hUZXJtOiBmaWx0ZXJWYWx1ZSB9XCI+PC9uZy1jb250YWluZXI+XG4gICAgICAgIDwvZGl2PlxuICAgIGBcbn0pXG5leHBvcnQgY2xhc3MgTmdEcm9wZG93blBhbmVsQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSB7XG5cbiAgICBASW5wdXQoKSBpdGVtczogTmdPcHRpb25bXSA9IFtdO1xuICAgIEBJbnB1dCgpIG1hcmtlZEl0ZW06IE5nT3B0aW9uO1xuICAgIEBJbnB1dCgpIHBvc2l0aW9uOiBEcm9wZG93blBvc2l0aW9uID0gJ2F1dG8nO1xuICAgIEBJbnB1dCgpIGFwcGVuZFRvOiBzdHJpbmc7XG4gICAgQElucHV0KCkgYnVmZmVyQW1vdW50O1xuICAgIEBJbnB1dCgpIHZpcnR1YWxTY3JvbGwgPSBmYWxzZTtcbiAgICBASW5wdXQoKSBoZWFkZXJTZWFyY2hUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBASW5wdXQoKSBoZWFkZXJUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBASW5wdXQoKSBmb290ZXJUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBASW5wdXQoKSBmaWx0ZXJWYWx1ZTogc3RyaW5nID0gbnVsbDtcbiAgICBASW5wdXQoKSBkeW5hbWljV2lkdGggPSBmYWxzZTtcblxuICAgIEBPdXRwdXQoKSB1cGRhdGUgPSBuZXcgRXZlbnRFbWl0dGVyPGFueVtdPigpO1xuICAgIEBPdXRwdXQoKSBzY3JvbGwgPSBuZXcgRXZlbnRFbWl0dGVyPHsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfT4oKTtcbiAgICBAT3V0cHV0KCkgc2Nyb2xsVG9FbmQgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KCk7XG4gICAgQE91dHB1dCgpIG91dHNpZGVDbGljayA9IG5ldyBFdmVudEVtaXR0ZXI8dm9pZD4oKTtcblxuICAgIEBWaWV3Q2hpbGQoJ2NvbnRlbnQnLCB7IHJlYWQ6IEVsZW1lbnRSZWYsIHN0YXRpYzogdHJ1ZSB9KSBjb250ZW50RWxlbWVudFJlZjogRWxlbWVudFJlZjtcbiAgICBAVmlld0NoaWxkKCdzY3JvbGwnLCB7IHJlYWQ6IEVsZW1lbnRSZWYsIHN0YXRpYzogdHJ1ZSB9KSBzY3JvbGxFbGVtZW50UmVmOiBFbGVtZW50UmVmO1xuICAgIEBWaWV3Q2hpbGQoJ3BhZGRpbmcnLCB7IHJlYWQ6IEVsZW1lbnRSZWYsIHN0YXRpYzogdHJ1ZSB9KSBwYWRkaW5nRWxlbWVudFJlZjogRWxlbWVudFJlZjtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Rlc3Ryb3kkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9kcm9wZG93bjogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBfdmlydHVhbFBhZGRpbmc6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgX3Njcm9sbGFibGVQYW5lbDogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBfY29udGVudFBhbmVsOiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIF9zZWxlY3Q6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgX3BhcmVudDogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBfc2Nyb2xsVG9FbmRGaXJlZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgX3VwZGF0ZVNjcm9sbEhlaWdodCA9IGZhbHNlO1xuICAgIHByaXZhdGUgX2xhc3RTY3JvbGxQb3NpdGlvbiA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSBfcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICAgICAgcHJpdmF0ZSBfem9uZTogTmdab25lLFxuICAgICAgICBwcml2YXRlIF9wYW5lbFNlcnZpY2U6IE5nRHJvcGRvd25QYW5lbFNlcnZpY2UsXG4gICAgICAgIF9lbGVtZW50UmVmOiBFbGVtZW50UmVmLFxuICAgICAgICBAT3B0aW9uYWwoKSBASW5qZWN0KERPQ1VNRU5UKSBwcml2YXRlIF9kb2N1bWVudDogYW55XG4gICAgKSB7XG4gICAgICAgIHRoaXMuX2Ryb3Bkb3duID0gX2VsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jdXJyZW50UG9zaXRpb246IERyb3Bkb3duUG9zaXRpb247XG5cbiAgICBnZXQgY3VycmVudFBvc2l0aW9uKCk6IERyb3Bkb3duUG9zaXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFBvc2l0aW9uO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2l0ZW1zTGVuZ3RoOiBudW1iZXI7XG5cbiAgICBwcml2YXRlIGdldCBpdGVtc0xlbmd0aCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zTGVuZ3RoO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2V0IGl0ZW1zTGVuZ3RoKHZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB0aGlzLl9pdGVtc0xlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5faXRlbXNMZW5ndGggPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuX29uSXRlbXNMZW5ndGhDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldCBfc3RhcnRPZmZzZXQoKSB7XG4gICAgICAgIGlmICh0aGlzLm1hcmtlZEl0ZW0pIHtcbiAgICAgICAgICAgIGNvbnN0IHsgaXRlbUhlaWdodCwgcGFuZWxIZWlnaHQgfSA9IHRoaXMuX3BhbmVsU2VydmljZS5kaW1lbnNpb25zO1xuICAgICAgICAgICAgY29uc3QgdmlzaWJsZUluZGV4ID0gXy5pbmRleE9mKHRoaXMuaXRlbXMsIHRoaXMubWFya2VkSXRlbSk7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB2aXNpYmxlSW5kZXggKiBpdGVtSGVpZ2h0O1xuICAgICAgICAgICAgcmV0dXJuIHBhbmVsSGVpZ2h0ID4gb2Zmc2V0ID8gMCA6IG9mZnNldDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICAvLyBjYWxjdWxhdGUgcGFuZWwgd2lkdGggZGVwZW5kcyBvbiBpdGVtcyBsYWJlbHMgbGVuZ3Roc1xuICAgIEBIb3N0QmluZGluZygnc3R5bGUud2lkdGgnKVxuICAgIGdldCBwYW5lbFdpZHRoKCk6IHN0cmluZ3tcbiAgICAgICAgaWYodGhpcy5keW5hbWljV2lkdGgpe1xuICAgICAgICAgICAgY29uc3QgbWF4TGFiZWwgPSBfLm1heChfLm1hcCh0aGlzLml0ZW1zLCBpID0+IF8uc2l6ZShpLmxhYmVsKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGAkezUwICsgbWF4TGFiZWwgKiA5fXB4ICFpbXBvcnRhbnRgO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRvbid0IHVzZSBkeW5hbWljIHdpZHRoXG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICBASG9zdExpc3RlbmVyKCdtb3VzZWRvd24nLCBbJyRldmVudCddKVxuICAgIGhhbmRsZU1vdXNlZG93bigkZXZlbnQ6IE1vdXNlRXZlbnQpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gJGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgaWYgKHRhcmdldC50YWdOYW1lID09PSAnSU5QVVQnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgbmdPbkluaXQoKSB7XG4gICAgICAgIHRoaXMuX3NlbGVjdCA9IHRoaXMuX2Ryb3Bkb3duLnBhcmVudEVsZW1lbnQ7XG4gICAgICAgIHRoaXMuX3ZpcnR1YWxQYWRkaW5nID0gdGhpcy5wYWRkaW5nRWxlbWVudFJlZi5uYXRpdmVFbGVtZW50O1xuICAgICAgICB0aGlzLl9zY3JvbGxhYmxlUGFuZWwgPSB0aGlzLnNjcm9sbEVsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcbiAgICAgICAgdGhpcy5fY29udGVudFBhbmVsID0gdGhpcy5jb250ZW50RWxlbWVudFJlZi5uYXRpdmVFbGVtZW50O1xuICAgICAgICB0aGlzLl9oYW5kbGVTY3JvbGwoKTtcbiAgICAgICAgdGhpcy5faGFuZGxlT3V0c2lkZUNsaWNrKCk7XG4gICAgICAgIHRoaXMuX2FwcGVuZERyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuX3NldHVwTW91c2Vkb3duTGlzdGVuZXIoKTtcbiAgICAgICAgLy8gc2Nyb2xsIHRvIGZpcnN0IG1hcmtlZCBpdGVtIG9uIGRyb3Bkb3duIG9wZW5pbmdcbiAgICAgICAgdGhpcy5zY3JvbGxUbyh0aGlzLm1hcmtlZEl0ZW0pO1xuICAgIH1cblxuICAgIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICAgICAgaWYgKGNoYW5nZXMuaXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZSA9IGNoYW5nZXMuaXRlbXM7XG4gICAgICAgICAgICB0aGlzLl9vbkl0ZW1zQ2hhbmdlKGNoYW5nZS5jdXJyZW50VmFsdWUsIGNoYW5nZS5maXJzdENoYW5nZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZ09uRGVzdHJveSgpIHtcbiAgICAgICAgdGhpcy5fZGVzdHJveSQubmV4dCgpO1xuICAgICAgICB0aGlzLl9kZXN0cm95JC5jb21wbGV0ZSgpO1xuICAgICAgICB0aGlzLl9kZXN0cm95JC51bnN1YnNjcmliZSgpO1xuICAgICAgICBpZiAodGhpcy5hcHBlbmRUbykge1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVyZXIucmVtb3ZlQ2hpbGQodGhpcy5fZHJvcGRvd24ucGFyZW50Tm9kZSwgdGhpcy5fZHJvcGRvd24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2Nyb2xsVG8ob3B0aW9uOiBOZ09wdGlvbiwgc3RhcnRGcm9tT3B0aW9uID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKCFvcHRpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5pdGVtcy5pbmRleE9mKG9wdGlvbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5pdGVtc0xlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHNjcm9sbFRvO1xuICAgICAgICBpZiAodGhpcy52aXJ0dWFsU2Nyb2xsKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtSGVpZ2h0ID0gdGhpcy5fcGFuZWxTZXJ2aWNlLmRpbWVuc2lvbnMuaXRlbUhlaWdodDtcbiAgICAgICAgICAgIHNjcm9sbFRvID0gdGhpcy5fcGFuZWxTZXJ2aWNlLmdldFNjcm9sbFRvKGluZGV4ICogaXRlbUhlaWdodCwgaXRlbUhlaWdodCwgdGhpcy5fbGFzdFNjcm9sbFBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW06IEhUTUxFbGVtZW50ID0gdGhpcy5fZHJvcGRvd24ucXVlcnlTZWxlY3RvcihgIyR7b3B0aW9uLmh0bWxJZH1gKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RTY3JvbGwgPSBzdGFydEZyb21PcHRpb24gPyBpdGVtLm9mZnNldFRvcCA6IHRoaXMuX2xhc3RTY3JvbGxQb3NpdGlvbjtcbiAgICAgICAgICAgIHNjcm9sbFRvID0gdGhpcy5fcGFuZWxTZXJ2aWNlLmdldFNjcm9sbFRvKGl0ZW0/Lm9mZnNldFRvcCB8fCAwLCBpdGVtPy5jbGllbnRIZWlnaHQgfHwgMzYsIGxhc3RTY3JvbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzRGVmaW5lZChzY3JvbGxUbykpIHtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbGFibGVQYW5lbC5zY3JvbGxUb3AgPSBzY3JvbGxUbztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNjcm9sbFRvVGFnKCkge1xuICAgICAgICBjb25zdCBwYW5lbCA9IHRoaXMuX3Njcm9sbGFibGVQYW5lbDtcbiAgICAgICAgcGFuZWwuc2Nyb2xsVG9wID0gcGFuZWwuc2Nyb2xsSGVpZ2h0IC0gcGFuZWwuY2xpZW50SGVpZ2h0O1xuICAgIH1cblxuICAgIGFkanVzdFBvc2l0aW9uKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVZUG9zaXRpb24oKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVEcm9wZG93blBvc2l0aW9uKCkge1xuICAgICAgICB0aGlzLl9jdXJyZW50UG9zaXRpb24gPSB0aGlzLl9jYWxjdWxhdGVDdXJyZW50UG9zaXRpb24odGhpcy5fZHJvcGRvd24pO1xuICAgICAgICBpZiAoQ1NTX1BPU0lUSU9OUy5pbmNsdWRlcyh0aGlzLl9jdXJyZW50UG9zaXRpb24pKSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVEcm9wZG93bkNsYXNzKHRoaXMuX2N1cnJlbnRQb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVEcm9wZG93bkNsYXNzKCdib3R0b20nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmFwcGVuZFRvKSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVZUG9zaXRpb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2Ryb3Bkb3duLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfdXBkYXRlRHJvcGRvd25DbGFzcyhjdXJyZW50UG9zaXRpb246IHN0cmluZykge1xuICAgICAgICBDU1NfUE9TSVRJT05TLmZvckVhY2goKHBvc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBSRU1PVkVfQ1NTX0NMQVNTID0gYG5nLXNlbGVjdC0ke3Bvc2l0aW9ufWA7XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLl9kcm9wZG93biwgUkVNT1ZFX0NTU19DTEFTUyk7XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLl9zZWxlY3QsIFJFTU9WRV9DU1NfQ0xBU1MpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBBRERfQ1NTX0NMQVNTID0gYG5nLXNlbGVjdC0ke2N1cnJlbnRQb3NpdGlvbn1gO1xuICAgICAgICB0aGlzLl9yZW5kZXJlci5hZGRDbGFzcyh0aGlzLl9kcm9wZG93biwgQUREX0NTU19DTEFTUyk7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyLmFkZENsYXNzKHRoaXMuX3NlbGVjdCwgQUREX0NTU19DTEFTUyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlU2Nyb2xsKCkge1xuICAgICAgICB0aGlzLl96b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcbiAgICAgICAgICAgIGZyb21FdmVudCh0aGlzLnNjcm9sbEVsZW1lbnRSZWYubmF0aXZlRWxlbWVudCwgJ3Njcm9sbCcpXG4gICAgICAgICAgICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3kkKSwgYXVkaXRUaW1lKDAsIFNDUk9MTF9TQ0hFRFVMRVIpKVxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKGU6IHsgcGF0aCwgY29tcG9zZWRQYXRoLCB0YXJnZXQgfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gZS5wYXRoIHx8IChlLmNvbXBvc2VkUGF0aCAmJiBlLmNvbXBvc2VkUGF0aCgpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDAgPyBlLnRhcmdldC5zY3JvbGxUb3AgOiBwYXRoWzBdLnNjcm9sbFRvcFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkNvbnRlbnRTY3JvbGxlZChzY3JvbGxUb3ApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVPdXRzaWRlQ2xpY2soKSB7XG4gICAgICAgIGlmICghdGhpcy5fZG9jdW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICAgICAgbWVyZ2UoXG4gICAgICAgICAgICAgICAgZnJvbUV2ZW50KHRoaXMuX2RvY3VtZW50LCAndG91Y2hzdGFydCcsIHsgY2FwdHVyZTogdHJ1ZSB9KSxcbiAgICAgICAgICAgICAgICBmcm9tRXZlbnQodGhpcy5fZG9jdW1lbnQsICdtb3VzZWRvd24nLCB7IGNhcHR1cmU6IHRydWUgfSlcbiAgICAgICAgICAgICkucGlwZSh0YWtlVW50aWwodGhpcy5fZGVzdHJveSQpKVxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoJGV2ZW50ID0+IHRoaXMuX2NoZWNrVG9DbG9zZSgkZXZlbnQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY2hlY2tUb0Nsb3NlKCRldmVudDogYW55KSB7XG4gICAgICAgIGlmICh0aGlzLl9zZWxlY3QuY29udGFpbnMoJGV2ZW50LnRhcmdldCkgfHwgdGhpcy5fZHJvcGRvd24uY29udGFpbnMoJGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhdGggPSAkZXZlbnQucGF0aCB8fCAoJGV2ZW50LmNvbXBvc2VkUGF0aCAmJiAkZXZlbnQuY29tcG9zZWRQYXRoKCkpO1xuICAgICAgICBpZiAoJGV2ZW50LnRhcmdldCAmJiAkZXZlbnQudGFyZ2V0LnNoYWRvd1Jvb3QgJiYgcGF0aCAmJiBwYXRoWzBdICYmIHRoaXMuX3NlbGVjdC5jb250YWlucyhwYXRoWzBdKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fem9uZS5ydW4oKCkgPT4gdGhpcy5vdXRzaWRlQ2xpY2suZW1pdCgpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9vbkl0ZW1zQ2hhbmdlKGl0ZW1zOiBOZ09wdGlvbltdLCBmaXJzdENoYW5nZTogYm9vbGVhbikge1xuICAgICAgICB0aGlzLml0ZW1zID0gaXRlbXMgfHwgW107XG4gICAgICAgIHRoaXMuX3Njcm9sbFRvRW5kRmlyZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pdGVtc0xlbmd0aCA9IGl0ZW1zLmxlbmd0aDtcblxuICAgICAgICBpZiAodGhpcy52aXJ0dWFsU2Nyb2xsKSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVJdGVtc1JhbmdlKGZpcnN0Q2hhbmdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NldFZpcnR1YWxIZWlnaHQoKTtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUl0ZW1zKGZpcnN0Q2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3VwZGF0ZUl0ZW1zKGZpcnN0Q2hhbmdlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMudXBkYXRlLmVtaXQodGhpcy5pdGVtcyk7XG4gICAgICAgIGlmIChmaXJzdENoYW5nZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFuZWxIZWlnaHQgPSB0aGlzLl9zY3JvbGxhYmxlUGFuZWwuY2xpZW50SGVpZ2h0O1xuICAgICAgICAgICAgICAgIHRoaXMuX3BhbmVsU2VydmljZS5zZXREaW1lbnNpb25zKDAsIHBhbmVsSGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVEcm9wZG93blBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxUbyh0aGlzLm1hcmtlZEl0ZW0sIGZpcnN0Q2hhbmdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF91cGRhdGVJdGVtc1JhbmdlKGZpcnN0Q2hhbmdlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fbWVhc3VyZURpbWVuc2lvbnMoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RDaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVySXRlbXNSYW5nZSh0aGlzLl9zdGFydE9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZURyb3Bkb3duUG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJJdGVtc1JhbmdlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX29uQ29udGVudFNjcm9sbGVkKHNjcm9sbFRvcDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLnZpcnR1YWxTY3JvbGwpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlckl0ZW1zUmFuZ2Uoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9sYXN0U2Nyb2xsUG9zaXRpb24gPSBzY3JvbGxUb3A7XG4gICAgICAgIHRoaXMuX2ZpcmVTY3JvbGxUb0VuZChzY3JvbGxUb3ApO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3VwZGF0ZVZpcnR1YWxIZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX3VwZGF0ZVNjcm9sbEhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5fdmlydHVhbFBhZGRpbmcuc3R5bGUuaGVpZ2h0ID0gYCR7aGVpZ2h0fXB4YDtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVNjcm9sbEhlaWdodCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0VmlydHVhbEhlaWdodCgpIHtcblxuICAgICAgICBpZiAoIXRoaXMuX3ZpcnR1YWxQYWRkaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl92aXJ0dWFsUGFkZGluZy5zdHlsZS5oZWlnaHQgPSBgMHB4YDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9vbkl0ZW1zTGVuZ3RoQ2hhbmdlZCgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlU2Nyb2xsSGVpZ2h0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9yZW5kZXJJdGVtc1JhbmdlKHNjcm9sbFRvcCA9IG51bGwpIHtcbiAgICAgICAgaWYgKHNjcm9sbFRvcCAmJiB0aGlzLl9sYXN0U2Nyb2xsUG9zaXRpb24gPT09IHNjcm9sbFRvcCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsVG9wID0gc2Nyb2xsVG9wIHx8IHRoaXMuX3Njcm9sbGFibGVQYW5lbC5zY3JvbGxUb3A7XG4gICAgICAgIGNvbnN0IHJhbmdlID0gdGhpcy5fcGFuZWxTZXJ2aWNlLmNhbGN1bGF0ZUl0ZW1zKHNjcm9sbFRvcCwgdGhpcy5pdGVtc0xlbmd0aCwgdGhpcy5idWZmZXJBbW91bnQpO1xuICAgICAgICB0aGlzLl91cGRhdGVWaXJ0dWFsSGVpZ2h0KHJhbmdlLnNjcm9sbEhlaWdodCk7XG4gICAgICAgIHRoaXMuX2NvbnRlbnRQYW5lbC5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlWSgke3JhbmdlLnRvcFBhZGRpbmd9cHgpYDtcblxuICAgICAgICB0aGlzLl96b25lLnJ1bigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZS5lbWl0KHRoaXMuaXRlbXMuc2xpY2UocmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZCkpO1xuICAgICAgICAgICAgdGhpcy5zY3JvbGwuZW1pdCh7IHN0YXJ0OiByYW5nZS5zdGFydCwgZW5kOiByYW5nZS5lbmQgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChpc0RlZmluZWQoc2Nyb2xsVG9wKSAmJiB0aGlzLl9sYXN0U2Nyb2xsUG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbGFibGVQYW5lbC5zY3JvbGxUb3AgPSBzY3JvbGxUb3A7XG4gICAgICAgICAgICB0aGlzLl9sYXN0U2Nyb2xsUG9zaXRpb24gPSBzY3JvbGxUb3A7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9tZWFzdXJlRGltZW5zaW9ucygpOiBQcm9taXNlPFBhbmVsRGltZW5zaW9ucz4ge1xuICAgICAgICBpZiAodGhpcy5fcGFuZWxTZXJ2aWNlLmRpbWVuc2lvbnMuaXRlbUhlaWdodCA+IDAgfHwgdGhpcy5pdGVtc0xlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9wYW5lbFNlcnZpY2UuZGltZW5zaW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBbZmlyc3RdID0gdGhpcy5pdGVtcztcbiAgICAgICAgdGhpcy51cGRhdGUuZW1pdChbZmlyc3RdKTtcblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvcHRpb24gPSB0aGlzLl9kcm9wZG93bi5xdWVyeVNlbGVjdG9yKGAjJHtmaXJzdC5odG1sSWR9YCk7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25IZWlnaHQgPSBvcHRpb24uY2xpZW50SGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5fdmlydHVhbFBhZGRpbmcuc3R5bGUuaGVpZ2h0ID0gYCR7b3B0aW9uSGVpZ2h0ICogdGhpcy5pdGVtc0xlbmd0aH1weGA7XG4gICAgICAgICAgICBjb25zdCBwYW5lbEhlaWdodCA9IHRoaXMuX3Njcm9sbGFibGVQYW5lbC5jbGllbnRIZWlnaHQ7XG4gICAgICAgICAgICB0aGlzLl9wYW5lbFNlcnZpY2Uuc2V0RGltZW5zaW9ucyhvcHRpb25IZWlnaHQsIHBhbmVsSGVpZ2h0KTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhbmVsU2VydmljZS5kaW1lbnNpb25zO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9maXJlU2Nyb2xsVG9FbmQoc2Nyb2xsVG9wOiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX3Njcm9sbFRvRW5kRmlyZWQgfHwgc2Nyb2xsVG9wID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYWRkaW5nID0gdGhpcy52aXJ0dWFsU2Nyb2xsID9cbiAgICAgICAgICAgIHRoaXMuX3ZpcnR1YWxQYWRkaW5nIDpcbiAgICAgICAgICAgIHRoaXMuX2NvbnRlbnRQYW5lbDtcblxuICAgICAgICBpZiAoc2Nyb2xsVG9wICsgdGhpcy5fZHJvcGRvd24uY2xpZW50SGVpZ2h0ID49IHBhZGRpbmcuY2xpZW50SGVpZ2h0IC0gMSkge1xuICAgICAgICAgICAgdGhpcy5fem9uZS5ydW4oKCkgPT4gdGhpcy5zY3JvbGxUb0VuZC5lbWl0KCkpO1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsVG9FbmRGaXJlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9jYWxjdWxhdGVDdXJyZW50UG9zaXRpb24oZHJvcGRvd25FbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucG9zaXRpb24gIT09ICdhdXRvJykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb247XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VsZWN0UmVjdDogQ2xpZW50UmVjdCA9IHRoaXMuX3NlbGVjdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcbiAgICAgICAgY29uc3Qgb2Zmc2V0VG9wID0gc2VsZWN0UmVjdC50b3AgKyB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHNlbGVjdFJlY3QuaGVpZ2h0O1xuICAgICAgICBjb25zdCBkcm9wZG93bkhlaWdodCA9IGRyb3Bkb3duRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgICBpZiAob2Zmc2V0VG9wICsgaGVpZ2h0ICsgZHJvcGRvd25IZWlnaHQgPiBzY3JvbGxUb3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSB7XG4gICAgICAgICAgICByZXR1cm4gJ3RvcCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJ2JvdHRvbSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9hcHBlbmREcm9wZG93bigpIHtcbiAgICAgICAgaWYgKCF0aGlzLmFwcGVuZFRvKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wYXJlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRoaXMuYXBwZW5kVG8pO1xuICAgICAgICBpZiAoIXRoaXMuX3BhcmVudCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhcHBlbmRUbyBzZWxlY3RvciAke3RoaXMuYXBwZW5kVG99IGRpZCBub3QgZm91bmQgYW55IHBhcmVudCBlbGVtZW50YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdXBkYXRlWFBvc2l0aW9uKCk7XG4gICAgICAgIHRoaXMuX3BhcmVudC5hcHBlbmRDaGlsZCh0aGlzLl9kcm9wZG93bik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfdXBkYXRlWFBvc2l0aW9uKCkge1xuICAgICAgICBjb25zdCBzZWxlY3QgPSB0aGlzLl9zZWxlY3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuX3BhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgY29uc3Qgb2Zmc2V0TGVmdCA9IHNlbGVjdC5sZWZ0IC0gcGFyZW50LmxlZnQ7XG5cbiAgICAgICAgdGhpcy5fZHJvcGRvd24uc3R5bGUubGVmdCA9IG9mZnNldExlZnQgKyAncHgnO1xuICAgICAgICB0aGlzLl9kcm9wZG93bi5zdHlsZS53aWR0aCA9IHNlbGVjdC53aWR0aCArICdweCc7XG4gICAgICAgIHRoaXMuX2Ryb3Bkb3duLnN0eWxlLm1pbldpZHRoID0gc2VsZWN0LndpZHRoICsgJ3B4JztcbiAgICB9XG5cbiAgICBwcml2YXRlIF91cGRhdGVZUG9zaXRpb24oKSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdCA9IHRoaXMuX3NlbGVjdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5fcGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICBjb25zdCBkZWx0YSA9IHNlbGVjdC5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1cnJlbnRQb3NpdGlvbiA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldEJvdHRvbSA9IHBhcmVudC5ib3R0b20gLSBzZWxlY3QuYm90dG9tO1xuICAgICAgICAgICAgdGhpcy5fZHJvcGRvd24uc3R5bGUuYm90dG9tID0gb2Zmc2V0Qm90dG9tICsgZGVsdGEgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5fZHJvcGRvd24uc3R5bGUudG9wID0gJ2F1dG8nO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1cnJlbnRQb3NpdGlvbiA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldFRvcCA9IHNlbGVjdC50b3AgLSBwYXJlbnQudG9wO1xuICAgICAgICAgICAgdGhpcy5fZHJvcGRvd24uc3R5bGUudG9wID0gb2Zmc2V0VG9wICsgZGVsdGEgKyAncHgnO1xuICAgICAgICAgICAgdGhpcy5fZHJvcGRvd24uc3R5bGUuYm90dG9tID0gJ2F1dG8nO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0dXBNb3VzZWRvd25MaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICAgICAgICBmcm9tRXZlbnQodGhpcy5fZHJvcGRvd24sICdtb3VzZWRvd24nKVxuICAgICAgICAgICAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLl9kZXN0cm95JCkpXG4gICAgICAgICAgICAgICAgLnN1YnNjcmliZSgoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LnRhZ05hbWUgPT09ICdJTlBVVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4iXX0=
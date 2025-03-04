import { ElementRef, EventEmitter, NgZone, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges, TemplateRef } from '@angular/core';
import { NgDropdownPanelService } from './ng-dropdown-panel.service';
import { DropdownPosition } from './ng-select.types';
import { NgOption } from './ng-select.types';
import * as i0 from "@angular/core";
export declare class NgDropdownPanelComponent implements OnInit, OnChanges, OnDestroy {
    private _renderer;
    private _zone;
    private _panelService;
    private _document;
    items: NgOption[];
    markedItem: NgOption;
    position: DropdownPosition;
    appendTo: string;
    bufferAmount: any;
    virtualScroll: boolean;
    headerSearchTemplate: TemplateRef<any>;
    headerTemplate: TemplateRef<any>;
    footerTemplate: TemplateRef<any>;
    filterValue: string;
    dynamicWidth: boolean;
    update: EventEmitter<any[]>;
    scroll: EventEmitter<{
        start: number;
        end: number;
    }>;
    scrollToEnd: EventEmitter<void>;
    outsideClick: EventEmitter<void>;
    contentElementRef: ElementRef;
    scrollElementRef: ElementRef;
    paddingElementRef: ElementRef;
    private readonly _destroy$;
    private readonly _dropdown;
    private _virtualPadding;
    private _scrollablePanel;
    private _contentPanel;
    private _select;
    private _parent;
    private _scrollToEndFired;
    private _updateScrollHeight;
    private _lastScrollPosition;
    constructor(_renderer: Renderer2, _zone: NgZone, _panelService: NgDropdownPanelService, _elementRef: ElementRef, _document: any);
    private _currentPosition;
    get currentPosition(): DropdownPosition;
    private _itemsLength;
    private get itemsLength();
    private set itemsLength(value);
    private get _startOffset();
    get panelWidth(): string;
    handleMousedown($event: MouseEvent): void;
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    ngOnDestroy(): void;
    scrollTo(option: NgOption, startFromOption?: boolean): void;
    scrollToTag(): void;
    adjustPosition(): void;
    private _handleDropdownPosition;
    private _updateDropdownClass;
    private _handleScroll;
    private _handleOutsideClick;
    private _checkToClose;
    private _onItemsChange;
    private _updateItems;
    private _updateItemsRange;
    private _onContentScrolled;
    private _updateVirtualHeight;
    private _setVirtualHeight;
    private _onItemsLengthChanged;
    private _renderItemsRange;
    private _measureDimensions;
    private _fireScrollToEnd;
    private _calculateCurrentPosition;
    private _appendDropdown;
    private _updateXPosition;
    private _updateYPosition;
    private _setupMousedownListener;
    static ɵfac: i0.ɵɵFactoryDeclaration<NgDropdownPanelComponent, [null, null, null, null, { optional: true; }]>;
    static ɵcmp: i0.ɵɵComponentDeclaration<NgDropdownPanelComponent, "ng-dropdown-panel", never, { "items": "items"; "markedItem": "markedItem"; "position": "position"; "appendTo": "appendTo"; "bufferAmount": "bufferAmount"; "virtualScroll": "virtualScroll"; "headerSearchTemplate": "headerSearchTemplate"; "headerTemplate": "headerTemplate"; "footerTemplate": "footerTemplate"; "filterValue": "filterValue"; "dynamicWidth": "dynamicWidth"; }, { "update": "update"; "scroll": "scroll"; "scrollToEnd": "scrollToEnd"; "outsideClick": "outsideClick"; }, never, ["*"], false>;
}

import { Component, forwardRef, Input, Output, EventEmitter, ContentChild, TemplateRef, ViewEncapsulation, HostListener, HostBinding, ViewChild, ChangeDetectionStrategy, Inject, ContentChildren, InjectionToken, Attribute } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntil, startWith, tap, debounceTime, map, filter } from 'rxjs/operators';
import { Subject, merge } from 'rxjs';
import { NgOptionTemplateDirective, NgLabelTemplateDirective, NgHeaderTemplateDirective, NgFooterTemplateDirective, NgOptgroupTemplateDirective, NgNotFoundTemplateDirective, NgTypeToSearchTemplateDirective, NgLoadingTextTemplateDirective, NgMultiLabelTemplateDirective, NgTagTemplateDirective, NgLoadingSpinnerTemplateDirective } from './ng-templates.directive';
import { isDefined, isFunction, isPromise, isObject } from './value-utils';
import { ItemsList } from './items-list';
import { KeyCode } from './ng-select.types';
import { newId } from './id';
import { NgDropdownPanelComponent } from './ng-dropdown-panel.component';
import { NgOptionComponent } from './ng-option.component';
import { NgDropdownPanelService } from './ng-dropdown-panel.service';
import * as i0 from "@angular/core";
import * as i1 from "./config.service";
import * as i2 from "./console.service";
import * as i3 from "@angular/common";
import * as i4 from "./ng-dropdown-panel.component";
import * as i5 from "./ng-templates.directive";
export const SELECTION_MODEL_FACTORY = new InjectionToken('ng-select-selection-model');
export class NgSelectComponent {
    constructor(classes, autoFocus, config, newSelectionModel, _elementRef, _cd, _console) {
        this.classes = classes;
        this.autoFocus = autoFocus;
        this.config = config;
        this._cd = _cd;
        this._console = _console;
        this.markFirst = true;
        this.dropdownPosition = 'auto';
        this.loading = false;
        this.closeOnSelect = true;
        this.hideSelected = false;
        this.selectOnTab = false;
        this.bufferAmount = 4;
        this.selectableGroup = false;
        this.selectableGroupAsModel = true;
        this.searchFn = null;
        this.trackByFn = null;
        this.clearOnBackspace = true;
        this.labelForId = null;
        this.inputAttrs = {};
        this.readonly = false;
        this.searchWhileComposing = true;
        this.minTermLength = 0;
        this.editableSearchTerm = false;
        this.keyDownFn = (_) => true;
        this.searchable = true;
        // Flag for using search input in dropdown panel. When true - it will hide default search input.
        this.useSearchInPanel = false;
        this.multiple = false;
        this.addTag = false;
        this.clearable = true;
        this.isOpen = false;
        // output events
        this.blurEvent = new EventEmitter();
        this.focusEvent = new EventEmitter();
        this.changeEvent = new EventEmitter();
        this.openEvent = new EventEmitter();
        this.closeEvent = new EventEmitter();
        this.searchEvent = new EventEmitter();
        this.clearEvent = new EventEmitter();
        this.addEvent = new EventEmitter();
        this.removeEvent = new EventEmitter();
        this.scroll = new EventEmitter();
        this.scrollToEnd = new EventEmitter();
        this.useDefaultClass = true;
        this.viewPortItems = [];
        this.searchTerm = null;
        this.dropdownId = newId();
        this.escapeHTML = true;
        this._items = [];
        this._defaultLabel = 'label';
        this._pressedKeys = [];
        this._isComposing = false;
        this._destroy$ = new Subject();
        this._keyPress$ = new Subject();
        this._onChange = (_) => { };
        this._onTouched = () => { };
        this.clearItem = (item) => {
            const option = this.selectedItems.find(x => x.value === item);
            this.unselect(option);
        };
        this.trackByOption = (_, item) => {
            if (this.trackByFn) {
                return this.trackByFn(item.value);
            }
            return item;
        };
        this._mergeGlobalConfig(config);
        this.itemsList = new ItemsList(this, newSelectionModel());
        this.element = _elementRef.nativeElement;
    }
    get items() { return this._items; }
    ;
    set items(value) {
        if (value === null) {
            value = [];
        }
        this._itemsAreUsed = true;
        this._items = value;
    }
    ;
    get compareWith() { return this._compareWith; }
    set compareWith(fn) {
        if (fn !== undefined && fn !== null && !isFunction(fn)) {
            throw Error('`compareWith` must be a function.');
        }
        this._compareWith = fn;
    }
    get clearSearchOnAdd() {
        if (isDefined(this._clearSearchOnAdd)) {
            return this._clearSearchOnAdd;
        }
        else if (isDefined(this.config.clearSearchOnAdd)) {
            return this.config.clearSearchOnAdd;
        }
        return this.closeOnSelect;
    }
    ;
    set clearSearchOnAdd(value) {
        this._clearSearchOnAdd = value;
    }
    ;
    get disabled() { return this.readonly || this._disabled; }
    ;
    get filtered() { return (!!this.searchTerm && this.searchable || this._isComposing); }
    ;
    get single() { return !this.multiple; }
    ;
    get searchableNoPanel() { return !this.searchable && !this.useSearchInPanel; }
    ;
    get _editableSearchTerm() {
        return this.editableSearchTerm && !this.multiple;
    }
    get selectedItems() {
        return this.itemsList.selectedItems;
    }
    get selectedValues() {
        return this.selectedItems.map(x => x.value);
    }
    get hasValue() {
        return this.selectedItems.length > 0;
    }
    get currentPanelPosition() {
        if (this.dropdownPanel) {
            return this.dropdownPanel.currentPosition;
        }
        return undefined;
    }
    ngOnInit() {
        this._handleKeyPresses();
        this._setInputAttributes();
    }
    ngOnChanges(changes) {
        if (changes.multiple) {
            this.itemsList.clearSelected();
        }
        if (changes.items) {
            this._setItems(changes.items.currentValue || []);
        }
        if (changes.isOpen) {
            this._manualOpen = isDefined(changes.isOpen.currentValue);
        }
    }
    ngAfterViewInit() {
        if (!this._itemsAreUsed) {
            this.escapeHTML = false;
            this._setItemsFromNgOptions();
        }
        if (isDefined(this.autoFocus)) {
            this.focus();
        }
    }
    ngOnDestroy() {
        this._destroy$.next();
        this._destroy$.complete();
    }
    handleKeyDown($event) {
        const keyCode = KeyCode[$event.which];
        if (keyCode) {
            if (this.keyDownFn($event) === false) {
                return;
            }
            this.handleKeyCode($event);
        }
        else if ($event.key && $event.key.length === 1) {
            this._keyPress$.next($event.key.toLocaleLowerCase());
        }
    }
    handleKeyCode($event) {
        switch ($event.which) {
            case KeyCode.ArrowDown:
                this._handleArrowDown($event);
                break;
            case KeyCode.ArrowUp:
                this._handleArrowUp($event);
                break;
            case KeyCode.Space:
                this._handleSpace($event);
                break;
            case KeyCode.Enter:
                this._handleEnter($event);
                break;
            case KeyCode.Tab:
                this._handleTab($event);
                break;
            case KeyCode.Esc:
                this.close();
                $event.preventDefault();
                break;
            case KeyCode.Backspace:
                this._handleBackspace();
                break;
        }
    }
    handleMousedown($event) {
        const target = $event.target;
        if (target.tagName !== 'INPUT') {
            $event.preventDefault();
        }
        if (target.classList.contains('ng-clear-wrapper')) {
            this.handleClearClick();
            return;
        }
        if (target.classList.contains('ng-arrow-wrapper')) {
            this.handleArrowClick();
            return;
        }
        if (target.classList.contains('ng-value-icon')) {
            return;
        }
        if (!this.focused) {
            this.focus();
        }
        if (this.searchable) {
            this.open();
        }
        else {
            this.toggle();
        }
    }
    handleArrowClick() {
        if (this.isOpen) {
            this.close();
        }
        else {
            this.open();
        }
    }
    handleClearClick() {
        if (this.hasValue) {
            this.itemsList.clearSelected(true);
            this._updateNgModel();
        }
        this._clearSearch();
        this.focus();
        this.clearEvent.emit();
        this._onSelectionChanged();
    }
    clearModel() {
        if (!this.clearable) {
            return;
        }
        this.itemsList.clearSelected();
        this._updateNgModel();
    }
    writeValue(value) {
        this.itemsList.clearSelected();
        this._handleWriteValue(value);
        this._cd.markForCheck();
    }
    registerOnChange(fn) {
        this._onChange = fn;
    }
    registerOnTouched(fn) {
        this._onTouched = fn;
    }
    setDisabledState(state) {
        this._disabled = state;
        this._cd.markForCheck();
    }
    toggle() {
        if (!this.isOpen) {
            this.open();
        }
        else {
            this.close();
        }
    }
    open() {
        if (this.disabled || this.isOpen || this._manualOpen || this.itemsList.maxItemsSelected) {
            return;
        }
        if (!this._isTypeahead && !this.addTag && this.itemsList.noItemsToSelect) {
            return;
        }
        this.isOpen = true;
        this.itemsList.markSelectedOrDefault(this.markFirst);
        this.openEvent.emit();
        if (!this.searchTerm) {
            // wait for dropdown panel to render
            setTimeout(() => {
                this.focus();
            }, 0);
        }
        this.detectChanges();
    }
    close() {
        if (!this.isOpen || this._manualOpen) {
            return;
        }
        this.isOpen = false;
        this._isComposing = false;
        if (!this._editableSearchTerm) {
            this._clearSearch();
        }
        else if (this.clearSearchOnAdd) {
            this.itemsList.resetFilteredItems();
        }
        this.itemsList.unmarkItem();
        this._onTouched();
        this.closeEvent.emit();
        this._cd.markForCheck();
    }
    toggleItem(item) {
        if (!item || item.disabled || this.disabled) {
            return;
        }
        if (this.multiple && item.selected) {
            this.unselect(item);
        }
        else {
            this.select(item);
        }
        if (this._editableSearchTerm) {
            this._setSearchTermFromItems();
        }
        this._onSelectionChanged();
    }
    select(item) {
        if (!item.selected) {
            this.itemsList.select(item);
            if (this.clearSearchOnAdd && !this._editableSearchTerm) {
                this._clearSearch();
            }
            this._updateNgModel();
            if (this.multiple) {
                this.addEvent.emit(item.value);
            }
        }
        if (this.closeOnSelect || this.itemsList.noItemsToSelect) {
            this.close();
        }
    }
    focus() {
        const input = this.useSearchInPanel ? this.headerSearchInput : this.searchInput;
        if (input) {
            input.nativeElement.focus();
        }
    }
    blur() {
        const input = this.useSearchInPanel ? this.headerSearchInput : this.searchInput;
        if (input) {
            input.nativeElement.blur();
        }
    }
    unselect(item) {
        if (!item) {
            return;
        }
        this.itemsList.unselect(item);
        this.focus();
        this._updateNgModel();
        this.removeEvent.emit(item);
    }
    selectTag() {
        let tag;
        if (isFunction(this.addTag)) {
            tag = this.addTag(this.searchTerm);
        }
        else {
            tag = this._primitive ? this.searchTerm : { [this.bindLabel]: this.searchTerm };
        }
        const handleTag = (item) => this._isTypeahead || !this.isOpen ? this.itemsList.mapItem(item, null) : this.itemsList.addItem(item);
        if (isPromise(tag)) {
            tag.then(item => this.select(handleTag(item))).catch(() => { });
        }
        else if (tag) {
            this.select(handleTag(tag));
        }
    }
    showClear() {
        return this.clearable && (this.hasValue || this.searchTerm) && !this.disabled;
    }
    get showAddTag() {
        if (!this._validTerm) {
            return false;
        }
        const term = this.searchTerm.toLowerCase().trim();
        return this.addTag &&
            (!this.itemsList.filteredItems.some(x => x.label.toLowerCase() === term) &&
                (!this.hideSelected && this.isOpen || !this.selectedItems.some(x => x.label.toLowerCase() === term))) &&
            !this.loading;
    }
    showNoItemsFound() {
        const empty = this.itemsList.filteredItems.length === 0;
        return ((empty && !this._isTypeahead && !this.loading) ||
            (empty && this._isTypeahead && this._validTerm && !this.loading)) &&
            !this.showAddTag;
    }
    showTypeToSearch() {
        const empty = this.itemsList.filteredItems.length === 0;
        return empty && this._isTypeahead && !this._validTerm && !this.loading;
    }
    onCompositionStart() {
        this._isComposing = true;
    }
    onCompositionEnd(term) {
        this._isComposing = false;
        if (this.searchWhileComposing) {
            return;
        }
        this.filter(term);
    }
    filter(term, params) {
        if (this._isComposing && !this.searchWhileComposing) {
            return;
        }
        this.searchTerm = term;
        if (this._isTypeahead && (this._validTerm || this.minTermLength === 0)) {
            this.typeahead.next(term);
        }
        if (!this._isTypeahead) {
            this.itemsList.filter(this.searchTerm, params);
            if (this.isOpen && this.markFirst) {
                this.itemsList.markSelectedOrDefault(this.markFirst);
            }
        }
        if (!this.useSearchInPanel) {
            this.searchEvent.emit({ term, items: this.itemsList.filteredItems.map(x => x.value) });
            this.open();
        }
    }
    onInputFocus($event) {
        if (this.focused) {
            return;
        }
        if (this._editableSearchTerm) {
            this._setSearchTermFromItems();
        }
        this.element.classList.add('ng-select-focused');
        this.focusEvent.emit($event);
        this.focused = true;
    }
    onInputBlur($event) {
        this.element.classList.remove('ng-select-focused');
        this.blurEvent.emit($event);
        if (!this.isOpen && !this.disabled) {
            this._onTouched();
        }
        if (this._editableSearchTerm) {
            this._setSearchTermFromItems();
        }
        this.focused = false;
    }
    onItemHover(item) {
        if (item.disabled) {
            return;
        }
        this.itemsList.markItem(item);
    }
    detectChanges() {
        if (!this._cd.destroyed) {
            this._cd.detectChanges();
        }
    }
    _setSearchTermFromItems() {
        // disable for now
        // const selected = this.selectedItems && this.selectedItems[0];
        // this.searchTerm = (selected && selected.label) || null;
    }
    _setItems(items) {
        const firstItem = items[0];
        this.bindLabel = this.bindLabel || this._defaultLabel;
        this._primitive = isDefined(firstItem) ? !isObject(firstItem) : this._primitive || this.bindLabel === this._defaultLabel;
        this.itemsList.setItems(items);
        if (items.length > 0 && this.hasValue) {
            this.itemsList.mapSelectedItems();
        }
        if (this.isOpen && isDefined(this.searchTerm) && !this._isTypeahead) {
            this.itemsList.filter(this.searchTerm);
        }
        if (this._isTypeahead || this.isOpen) {
            this.itemsList.markSelectedOrDefault(this.markFirst);
        }
    }
    _setItemsFromNgOptions() {
        const mapNgOptions = (options) => {
            this.items = options.map(option => ({
                $ngOptionValue: option.value,
                $ngOptionLabel: option.elementRef.nativeElement.innerHTML,
                disabled: option.disabled
            }));
            this.itemsList.setItems(this.items);
            if (this.hasValue) {
                this.itemsList.mapSelectedItems();
            }
            this.detectChanges();
        };
        const handleOptionChange = () => {
            const changedOrDestroyed = merge(this.ngOptions.changes, this._destroy$);
            merge(...this.ngOptions.map(option => option.stateChange$))
                .pipe(takeUntil(changedOrDestroyed))
                .subscribe(option => {
                const item = this.itemsList.findItem(option.value);
                item.disabled = option.disabled;
                item.label = option.label || item.label;
                this._cd.detectChanges();
            });
        };
        this.ngOptions.changes
            .pipe(startWith(this.ngOptions), takeUntil(this._destroy$))
            .subscribe(options => {
            this.bindLabel = this._defaultLabel;
            mapNgOptions(options);
            handleOptionChange();
        });
    }
    _isValidWriteValue(value) {
        if (!isDefined(value) || (this.multiple && value === '') || Array.isArray(value) && value.length === 0) {
            return false;
        }
        const validateBinding = (item) => {
            if (!isDefined(this.compareWith) && isObject(item) && this.bindValue) {
                this._console.warn(`Setting object(${JSON.stringify(item)}) as your model with bindValue is not allowed unless [compareWith] is used.`);
                return false;
            }
            return true;
        };
        if (this.multiple) {
            if (!Array.isArray(value)) {
                this._console.warn('Multiple select ngModel should be array.');
                return false;
            }
            return value.every(item => validateBinding(item));
        }
        else {
            return validateBinding(value);
        }
    }
    _handleWriteValue(ngModel) {
        if (!this._isValidWriteValue(ngModel)) {
            return;
        }
        const select = (val) => {
            let item = this.itemsList.findItem(val);
            if (item) {
                this.itemsList.select(item);
            }
            else {
                const isValObject = isObject(val);
                const isPrimitive = !isValObject && !this.bindValue;
                if ((isValObject || isPrimitive)) {
                    this.itemsList.select(this.itemsList.mapItem(val, null));
                }
                else if (this.bindValue) {
                    item = {
                        [this.bindLabel]: null,
                        [this.bindValue]: val
                    };
                    this.itemsList.select(this.itemsList.mapItem(item, null));
                }
            }
        };
        if (this.multiple) {
            ngModel.forEach(item => select(item));
        }
        else {
            select(ngModel);
        }
    }
    _handleKeyPresses() {
        if (this.searchable) {
            return;
        }
        this._keyPress$
            .pipe(takeUntil(this._destroy$), tap(letter => this._pressedKeys.push(letter)), debounceTime(200), filter(() => this._pressedKeys.length > 0), map(() => this._pressedKeys.join('')))
            .subscribe(term => {
            const item = this.itemsList.findByLabel(term);
            if (item) {
                if (this.isOpen) {
                    this.itemsList.markItem(item);
                    this._scrollToMarked();
                    this._cd.markForCheck();
                }
                else {
                    this.select(item);
                }
            }
            this._pressedKeys = [];
        });
    }
    _setInputAttributes() {
        const input = this.useSearchInPanel ? this.headerSearchInput : this.searchInput;
        if (!input) {
            // try again later
            return;
        }
        const attributes = {
            type: 'text',
            autocorrect: 'off',
            autocapitalize: 'off',
            autocomplete: this.labelForId ? 'off' : this.dropdownId,
            ...this.inputAttrs
        };
        for (const key of Object.keys(attributes)) {
            input.nativeElement.setAttribute(key, attributes[key]);
        }
    }
    _updateNgModel() {
        const model = [];
        for (const item of this.selectedItems) {
            if (this.bindValue) {
                let value = null;
                if (item.children) {
                    const groupKey = this.groupValue ? this.bindValue : this.groupBy;
                    value = item.value[groupKey || this.groupBy];
                }
                else {
                    value = this.itemsList.resolveNested(item.value, this.bindValue);
                }
                model.push(value);
            }
            else {
                model.push(item.value);
            }
        }
        const selected = this.selectedItems.map(x => x.value);
        if (this.multiple) {
            this._onChange(model);
            this.changeEvent.emit(selected);
        }
        else {
            this._onChange(isDefined(model[0]) ? model[0] : null);
            this.changeEvent.emit(selected[0]);
        }
        this._cd.markForCheck();
    }
    _clearSearch() {
        if (!this.searchTerm) {
            return;
        }
        this._changeSearch(null);
        this.itemsList.resetFilteredItems();
    }
    _changeSearch(searchTerm) {
        this.searchTerm = searchTerm;
        if (this._isTypeahead) {
            this.typeahead.next(searchTerm);
        }
    }
    _scrollToMarked() {
        if (!this.isOpen || !this.dropdownPanel) {
            return;
        }
        this.dropdownPanel.scrollTo(this.itemsList.markedItem);
    }
    _scrollToTag() {
        if (!this.isOpen || !this.dropdownPanel) {
            return;
        }
        this.dropdownPanel.scrollToTag();
    }
    _onSelectionChanged() {
        if (this.isOpen && this.multiple && this.appendTo) {
            // Make sure items are rendered.
            this._cd.detectChanges();
            this.dropdownPanel.adjustPosition();
        }
    }
    _handleTab($event) {
        if (this.isOpen === false && !this.addTag) {
            return;
        }
        if (this.selectOnTab) {
            if (this.itemsList.markedItem) {
                this.toggleItem(this.itemsList.markedItem);
                $event.preventDefault();
            }
            else if (this.showAddTag) {
                this.selectTag();
                $event.preventDefault();
            }
            else {
                this.close();
            }
        }
        else {
            this.close();
        }
    }
    _handleEnter($event) {
        if (this.isOpen || this._manualOpen) {
            if (this.itemsList.markedItem) {
                this.toggleItem(this.itemsList.markedItem);
            }
            else if (this.showAddTag) {
                this.selectTag();
            }
        }
        else if (this.openOnEnter) {
            this.open();
        }
        else {
            return;
        }
        $event.preventDefault();
    }
    _handleSpace($event) {
        if (this.isOpen || this._manualOpen) {
            return;
        }
        this.open();
        $event.preventDefault();
    }
    _handleArrowDown($event) {
        if (this._nextItemIsTag(+1)) {
            this.itemsList.unmarkItem();
            this._scrollToTag();
        }
        else {
            this.itemsList.markNextItem();
            this._scrollToMarked();
        }
        this.open();
        $event.preventDefault();
    }
    _handleArrowUp($event) {
        if (!this.isOpen) {
            return;
        }
        if (this._nextItemIsTag(-1)) {
            this.itemsList.unmarkItem();
            this._scrollToTag();
        }
        else {
            this.itemsList.markPreviousItem();
            this._scrollToMarked();
        }
        $event.preventDefault();
    }
    _nextItemIsTag(nextStep) {
        const nextIndex = this.itemsList.markedIndex + nextStep;
        return this.addTag && this.searchTerm
            && this.itemsList.markedItem
            && (nextIndex < 0 || nextIndex === this.itemsList.filteredItems.length);
    }
    _handleBackspace() {
        if (this.searchTerm || !this.clearable || !this.clearOnBackspace || !this.hasValue) {
            return;
        }
        if (this.multiple) {
            this.unselect(this.itemsList.lastSelectedItem);
        }
        else {
            this.clearModel();
        }
    }
    get _isTypeahead() {
        return this.typeahead && this.typeahead.observers.length > 0;
    }
    get _validTerm() {
        const term = this.searchTerm && this.searchTerm.trim();
        return term && term.length >= this.minTermLength;
    }
    _mergeGlobalConfig(config) {
        this.placeholder = this.placeholder || config.placeholder;
        this.notFoundText = this.notFoundText || config.notFoundText;
        this.typeToSearchText = this.typeToSearchText || config.typeToSearchText;
        this.addTagText = this.addTagText || config.addTagText;
        this.loadingText = this.loadingText || config.loadingText;
        this.clearAllText = this.clearAllText || config.clearAllText;
        this.virtualScroll = isDefined(this.virtualScroll)
            ? this.virtualScroll
            : isDefined(config.disableVirtualScroll) ? !config.disableVirtualScroll : false;
        this.openOnEnter = isDefined(this.openOnEnter) ? this.openOnEnter : config.openOnEnter;
        this.appendTo = this.appendTo || config.appendTo;
        this.bindValue = this.bindValue || config.bindValue;
        this.bindLabel = this.bindLabel || config.bindLabel;
        this.appearance = this.appearance || config.appearance;
    }
}
NgSelectComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0", ngImport: i0, type: NgSelectComponent, deps: [{ token: 'class', attribute: true }, { token: 'autofocus', attribute: true }, { token: i1.NgSelectConfig }, { token: SELECTION_MODEL_FACTORY }, { token: i0.ElementRef }, { token: i0.ChangeDetectorRef }, { token: i2.ConsoleService }], target: i0.ɵɵFactoryTarget.Component });
NgSelectComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "14.0.0", type: NgSelectComponent, selector: "ng-select", inputs: { bindLabel: "bindLabel", bindValue: "bindValue", markFirst: "markFirst", placeholder: "placeholder", notFoundText: "notFoundText", typeToSearchText: "typeToSearchText", addTagText: "addTagText", loadingText: "loadingText", clearAllText: "clearAllText", appearance: "appearance", dropdownPosition: "dropdownPosition", appendTo: "appendTo", loading: "loading", closeOnSelect: "closeOnSelect", hideSelected: "hideSelected", selectOnTab: "selectOnTab", openOnEnter: "openOnEnter", maxSelectedItems: "maxSelectedItems", groupBy: "groupBy", groupValue: "groupValue", bufferAmount: "bufferAmount", virtualScroll: "virtualScroll", selectableGroup: "selectableGroup", selectableGroupAsModel: "selectableGroupAsModel", searchFn: "searchFn", trackByFn: "trackByFn", clearOnBackspace: "clearOnBackspace", labelForId: "labelForId", inputAttrs: "inputAttrs", tabIndex: "tabIndex", readonly: "readonly", searchWhileComposing: "searchWhileComposing", minTermLength: "minTermLength", editableSearchTerm: "editableSearchTerm", keyDownFn: "keyDownFn", searchable: "searchable", useSearchInPanel: "useSearchInPanel", typeahead: "typeahead", multiple: "multiple", addTag: "addTag", clearable: "clearable", isOpen: "isOpen", items: "items", compareWith: "compareWith", clearSearchOnAdd: "clearSearchOnAdd" }, outputs: { blurEvent: "blur", focusEvent: "focus", changeEvent: "change", openEvent: "open", closeEvent: "close", searchEvent: "search", clearEvent: "clear", addEvent: "add", removeEvent: "remove", scroll: "scroll", scrollToEnd: "scrollToEnd" }, host: { listeners: { "keydown": "handleKeyDown($event)" }, properties: { "class.ng-select-typeahead": "this.typeahead", "class.ng-select-multiple": "this.multiple", "class.ng-select-taggable": "this.addTag", "class.ng-select-clearable": "this.clearable", "class.ng-select-opened": "this.isOpen", "class.ng-select": "this.useDefaultClass", "class.ng-select-disabled": "this.disabled", "class.ng-select-filtered": "this.filtered", "class.ng-select-single": "this.single", "class.ng-select-searchable": "this.searchableNoPanel" } }, providers: [{
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NgSelectComponent),
            multi: true
        }, NgDropdownPanelService], queries: [{ propertyName: "optionTemplate", first: true, predicate: NgOptionTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "optgroupTemplate", first: true, predicate: NgOptgroupTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "labelTemplate", first: true, predicate: NgLabelTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "multiLabelTemplate", first: true, predicate: NgMultiLabelTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "headerTemplate", first: true, predicate: NgHeaderTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "footerTemplate", first: true, predicate: NgFooterTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "notFoundTemplate", first: true, predicate: NgNotFoundTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "typeToSearchTemplate", first: true, predicate: NgTypeToSearchTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "loadingTextTemplate", first: true, predicate: NgLoadingTextTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "tagTemplate", first: true, predicate: NgTagTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "loadingSpinnerTemplate", first: true, predicate: NgLoadingSpinnerTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "ngOptions", predicate: NgOptionComponent, descendants: true }], viewQueries: [{ propertyName: "headerSearchInput", first: true, predicate: ["headerSearchInput"], descendants: true }, { propertyName: "dropdownPanel", first: true, predicate: i0.forwardRef(function () { return NgDropdownPanelComponent; }), descendants: true }, { propertyName: "searchInput", first: true, predicate: ["searchInput"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: "<div\n    (mousedown)=\"handleMousedown($event)\"\n    [class.ng-appearance-outline]=\"appearance === 'outline'\"\n    [class.ng-has-value]=\"hasValue\"\n    [ngClass]=\"{'ng-use-search-input': !useSearchInPanel}\"\n    class=\"ng-select-container\">\n\n    <div class=\"ng-value-container\">\n        <div class=\"ng-placeholder\">{{placeholder}}</div>\n\n        <ng-container *ngIf=\"(!multiLabelTemplate  || !multiple ) && selectedItems.length > 0\">\n            <div [class.ng-value-disabled]=\"item.disabled\" class=\"ng-value\" *ngFor=\"let item of selectedItems; trackBy: trackByOption\">\n                <ng-template #defaultLabelTemplate>\n                    <span class=\"ng-value-icon left\" (click)=\"unselect(item);\" aria-hidden=\"true\">\u00D7</span>\n                    <span class=\"ng-value-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n                </ng-template>\n\n                <ng-template\n                    [ngTemplateOutlet]=\"labelTemplate || defaultLabelTemplate\"\n                    [ngTemplateOutletContext]=\"{ item: item.value, clear: clearItem, label: item.label }\">\n                </ng-template>\n            </div>\n        </ng-container>\n\n        <ng-template *ngIf=\"multiple && multiLabelTemplate && selectedValues.length > 0\"\n                [ngTemplateOutlet]=\"multiLabelTemplate\"\n                [ngTemplateOutletContext]=\"{ items: selectedValues, clear: clearItem }\">\n        </ng-template>\n\n        <div class=\"ng-input\"\n            role=\"combobox\"\n            [attr.aria-expanded]=\"isOpen\"\n            [attr.aria-owns]=\"isOpen ? dropdownId : null\"\n            aria-haspopup=\"listbox\">\n\n            <input #searchInput\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(searchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(searchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </div>\n\n    <ng-container *ngIf=\"loading\">\n        <ng-template #defaultLoadingSpinnerTemplate>\n            <div class=\"ng-spinner-loader\"></div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingSpinnerTemplate || defaultLoadingSpinnerTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <span *ngIf=\"showClear()\" class=\"ng-clear-wrapper\" title=\"{{clearAllText}}\">\n        <span class=\"ng-clear\" aria-hidden=\"true\">\u00D7</span>\n    </span>\n\n    <span class=\"ng-arrow-wrapper\">\n        <span class=\"ng-arrow\"></span>\n    </span>\n</div>\n\n<ng-dropdown-panel *ngIf=\"isOpen\"\n                   class=\"ng-dropdown-panel\"\n                   [virtualScroll]=\"virtualScroll\"\n                   [bufferAmount]=\"bufferAmount\"\n                   [appendTo]=\"appendTo\"\n                   [position]=\"dropdownPosition\"\n                   [headerSearchTemplate]=\"useSearchInPanel ? headerSearchTemplate : null\"\n                   [headerTemplate]=\"headerTemplate\"\n                   [footerTemplate]=\"footerTemplate\"\n                   [filterValue]=\"searchTerm\"\n                   [items]=\"itemsList.filteredItems\"\n                   [markedItem]=\"itemsList.markedItem\"\n                   (update)=\"viewPortItems = $event\"\n                   (scroll)=\"scroll.emit($event)\"\n                   (scrollToEnd)=\"scrollToEnd.emit($event)\"\n                   (outsideClick)=\"close()\"\n                   [class.ng-select-multiple]=\"multiple\"\n                   [ngClass]=\"appendTo ? classes : null\"\n                   [id]=\"dropdownId\"\n                   role=\"listbox\"\n                   aria-label=\"Options list\">\n\n    <ng-template #headerSearchTemplate>\n        <div class=\"ng-select-dropdown-search m-n\">\n            <input #headerSearchInput\n                   class=\"form-control search-input\"\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(headerSearchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(headerSearchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   placeholder=\"Search\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </ng-template>\n\n    <ng-container>\n        <div class=\"ng-option\" [attr.role]=\"item.children ? 'group' : 'option'\" (click)=\"toggleItem(item)\" (mouseover)=\"onItemHover(item)\"\n                *ngFor=\"let item of viewPortItems; trackBy: trackByOption\"\n                [class.ng-option-disabled]=\"item.disabled\"\n                [class.ng-option-selected]=\"item.selected\"\n                [class.ng-optgroup]=\"item.children\"\n                [class.ng-option]=\"!item.children\"\n                [class.ng-option-child]=\"!!item.parent\"\n                [class.ng-option-marked]=\"item === itemsList.markedItem\"\n                [attr.aria-selected]=\"item.selected\"\n                [attr.id]=\"item?.htmlId\">\n\n            <ng-template #defaultOptionTemplate>\n                <span class=\"ng-option-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"item.children ? (optgroupTemplate || defaultOptionTemplate) : (optionTemplate || defaultOptionTemplate)\"\n                [ngTemplateOutletContext]=\"{ item: item.value, item$:item, index: item.index, searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n\n        <div class=\"ng-option\" [class.ng-option-marked]=\"!itemsList.markedItem\" (mouseover)=\"itemsList.unmarkItem()\" role=\"option\" (click)=\"selectTag()\" *ngIf=\"showAddTag\">\n            <ng-template #defaultTagTemplate>\n                <span><span class=\"ng-tag-label\">{{addTagText}}</span>\"{{searchTerm}}\"</span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"tagTemplate || defaultTagTemplate\"\n                [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n    </ng-container>\n\n    <ng-container *ngIf=\"showNoItemsFound()\">\n        <ng-template #defaultNotFoundTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{notFoundText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"notFoundTemplate || defaultNotFoundTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"showTypeToSearch()\">\n        <ng-template #defaultTypeToSearchTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{typeToSearchText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"typeToSearchTemplate || defaultTypeToSearchTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"loading && itemsList.filteredItems.length === 0\">\n        <ng-template #defaultLoadingTextTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{loadingText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingTextTemplate || defaultLoadingTextTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n</ng-dropdown-panel>\n", styles: ["@charset \"UTF-8\";.ng-select{position:relative;display:block;box-sizing:border-box}.ng-select div,.ng-select input,.ng-select span{box-sizing:border-box}.ng-select [hidden]{display:none}.ng-select.ng-select-searchable .ng-select-container .ng-value-container .ng-input{opacity:1}.ng-select.ng-select-opened .ng-select-container{z-index:1001}.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-placeholder,.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-value{-webkit-user-select:none;user-select:none;cursor:default}.ng-select.ng-select-disabled .ng-arrow-wrapper{cursor:default}.ng-select.ng-select-filtered .ng-placeholder{display:none}.ng-select .ng-select-container{cursor:default;display:flex;outline:none;overflow:hidden;position:relative;width:100%}.ng-select .ng-select-container .ng-value-container{display:flex;flex:1}.ng-select .ng-select-container .ng-value-container .ng-input{opacity:0}.ng-select .ng-select-container .ng-value-container .ng-input>input{box-sizing:content-box;background:none transparent;border:0 none;box-shadow:none;outline:none;padding:0;cursor:default;width:100%}.ng-select .ng-select-container .ng-value-container .ng-input>input::-ms-clear{display:none}.ng-select .ng-select-container .ng-value-container .ng-input>input[readonly]{-webkit-user-select:none;user-select:none;width:0;padding:0}.ng-select.ng-select-single.ng-select-filtered .ng-select-container .ng-value-container .ng-value{visibility:hidden}.ng-select.ng-select-single .ng-select-container .ng-value-container,.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-input{position:absolute;left:0;width:100%}.ng-select.ng-select-multiple.ng-select-disabled>.ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container{flex-wrap:wrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{position:absolute}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value{white-space:nowrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value.ng-value-disabled .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon{cursor:pointer}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-input{flex:1;z-index:2}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{z-index:1}.ng-select .ng-clear-wrapper{cursor:pointer;position:relative;width:17px;-webkit-user-select:none;user-select:none}.ng-select .ng-clear-wrapper .ng-clear{display:inline-block;font-size:18px;line-height:1;pointer-events:none}.ng-select .ng-spinner-loader{border-radius:50%;width:17px;height:17px;margin-right:5px;font-size:10px;position:relative;text-indent:-9999em;border-top:2px solid rgba(66,66,66,.2);border-right:2px solid rgba(66,66,66,.2);border-bottom:2px solid rgba(66,66,66,.2);border-left:2px solid #424242;transform:translateZ(0);animation:load8 .8s infinite linear}.ng-select .ng-spinner-loader:after{border-radius:50%;width:17px;height:17px}@keyframes load8{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.ng-select .ng-arrow-wrapper{cursor:pointer;position:relative;text-align:center;-webkit-user-select:none;user-select:none}.ng-select .ng-arrow-wrapper .ng-arrow{pointer-events:none;display:inline-block;height:0;width:0;position:relative}.ng-dropdown-panel{box-sizing:border-box;position:absolute;opacity:0;width:100%;z-index:1050;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .ng-dropdown-panel-items{display:block;height:auto;box-sizing:border-box;max-height:240px;overflow-y:auto}.ng-dropdown-panel .ng-dropdown-panel-items .ng-optgroup{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option{box-sizing:border-box;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .ng-option-label:empty:before{content:\"\\200b\"}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .highlighted{font-weight:700;text-decoration:underline}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.disabled{cursor:default}.ng-dropdown-panel .scroll-host{overflow:hidden;overflow-y:auto;position:relative;display:block;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .scrollable-content{top:0;left:0;width:100%;height:100%;position:absolute}.ng-dropdown-panel .total-padding{width:1px;opacity:0}\n"], dependencies: [{ kind: "directive", type: i3.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i3.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: i3.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i3.NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }, { kind: "component", type: i4.NgDropdownPanelComponent, selector: "ng-dropdown-panel", inputs: ["items", "markedItem", "position", "appendTo", "bufferAmount", "virtualScroll", "headerSearchTemplate", "headerTemplate", "footerTemplate", "filterValue"], outputs: ["update", "scroll", "scrollToEnd", "outsideClick"] }, { kind: "directive", type: i5.NgItemLabelDirective, selector: "[ngItemLabel]", inputs: ["ngItemLabel", "escape"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0", ngImport: i0, type: NgSelectComponent, decorators: [{
            type: Component,
            args: [{ selector: 'ng-select', providers: [{
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(() => NgSelectComponent),
                            multi: true
                        }, NgDropdownPanelService], encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy.OnPush, template: "<div\n    (mousedown)=\"handleMousedown($event)\"\n    [class.ng-appearance-outline]=\"appearance === 'outline'\"\n    [class.ng-has-value]=\"hasValue\"\n    [ngClass]=\"{'ng-use-search-input': !useSearchInPanel}\"\n    class=\"ng-select-container\">\n\n    <div class=\"ng-value-container\">\n        <div class=\"ng-placeholder\">{{placeholder}}</div>\n\n        <ng-container *ngIf=\"(!multiLabelTemplate  || !multiple ) && selectedItems.length > 0\">\n            <div [class.ng-value-disabled]=\"item.disabled\" class=\"ng-value\" *ngFor=\"let item of selectedItems; trackBy: trackByOption\">\n                <ng-template #defaultLabelTemplate>\n                    <span class=\"ng-value-icon left\" (click)=\"unselect(item);\" aria-hidden=\"true\">\u00D7</span>\n                    <span class=\"ng-value-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n                </ng-template>\n\n                <ng-template\n                    [ngTemplateOutlet]=\"labelTemplate || defaultLabelTemplate\"\n                    [ngTemplateOutletContext]=\"{ item: item.value, clear: clearItem, label: item.label }\">\n                </ng-template>\n            </div>\n        </ng-container>\n\n        <ng-template *ngIf=\"multiple && multiLabelTemplate && selectedValues.length > 0\"\n                [ngTemplateOutlet]=\"multiLabelTemplate\"\n                [ngTemplateOutletContext]=\"{ items: selectedValues, clear: clearItem }\">\n        </ng-template>\n\n        <div class=\"ng-input\"\n            role=\"combobox\"\n            [attr.aria-expanded]=\"isOpen\"\n            [attr.aria-owns]=\"isOpen ? dropdownId : null\"\n            aria-haspopup=\"listbox\">\n\n            <input #searchInput\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(searchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(searchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </div>\n\n    <ng-container *ngIf=\"loading\">\n        <ng-template #defaultLoadingSpinnerTemplate>\n            <div class=\"ng-spinner-loader\"></div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingSpinnerTemplate || defaultLoadingSpinnerTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <span *ngIf=\"showClear()\" class=\"ng-clear-wrapper\" title=\"{{clearAllText}}\">\n        <span class=\"ng-clear\" aria-hidden=\"true\">\u00D7</span>\n    </span>\n\n    <span class=\"ng-arrow-wrapper\">\n        <span class=\"ng-arrow\"></span>\n    </span>\n</div>\n\n<ng-dropdown-panel *ngIf=\"isOpen\"\n                   class=\"ng-dropdown-panel\"\n                   [virtualScroll]=\"virtualScroll\"\n                   [bufferAmount]=\"bufferAmount\"\n                   [appendTo]=\"appendTo\"\n                   [position]=\"dropdownPosition\"\n                   [headerSearchTemplate]=\"useSearchInPanel ? headerSearchTemplate : null\"\n                   [headerTemplate]=\"headerTemplate\"\n                   [footerTemplate]=\"footerTemplate\"\n                   [filterValue]=\"searchTerm\"\n                   [items]=\"itemsList.filteredItems\"\n                   [markedItem]=\"itemsList.markedItem\"\n                   (update)=\"viewPortItems = $event\"\n                   (scroll)=\"scroll.emit($event)\"\n                   (scrollToEnd)=\"scrollToEnd.emit($event)\"\n                   (outsideClick)=\"close()\"\n                   [class.ng-select-multiple]=\"multiple\"\n                   [ngClass]=\"appendTo ? classes : null\"\n                   [id]=\"dropdownId\"\n                   role=\"listbox\"\n                   aria-label=\"Options list\">\n\n    <ng-template #headerSearchTemplate>\n        <div class=\"ng-select-dropdown-search m-n\">\n            <input #headerSearchInput\n                   class=\"form-control search-input\"\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(headerSearchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(headerSearchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   placeholder=\"Search\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </ng-template>\n\n    <ng-container>\n        <div class=\"ng-option\" [attr.role]=\"item.children ? 'group' : 'option'\" (click)=\"toggleItem(item)\" (mouseover)=\"onItemHover(item)\"\n                *ngFor=\"let item of viewPortItems; trackBy: trackByOption\"\n                [class.ng-option-disabled]=\"item.disabled\"\n                [class.ng-option-selected]=\"item.selected\"\n                [class.ng-optgroup]=\"item.children\"\n                [class.ng-option]=\"!item.children\"\n                [class.ng-option-child]=\"!!item.parent\"\n                [class.ng-option-marked]=\"item === itemsList.markedItem\"\n                [attr.aria-selected]=\"item.selected\"\n                [attr.id]=\"item?.htmlId\">\n\n            <ng-template #defaultOptionTemplate>\n                <span class=\"ng-option-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"item.children ? (optgroupTemplate || defaultOptionTemplate) : (optionTemplate || defaultOptionTemplate)\"\n                [ngTemplateOutletContext]=\"{ item: item.value, item$:item, index: item.index, searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n\n        <div class=\"ng-option\" [class.ng-option-marked]=\"!itemsList.markedItem\" (mouseover)=\"itemsList.unmarkItem()\" role=\"option\" (click)=\"selectTag()\" *ngIf=\"showAddTag\">\n            <ng-template #defaultTagTemplate>\n                <span><span class=\"ng-tag-label\">{{addTagText}}</span>\"{{searchTerm}}\"</span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"tagTemplate || defaultTagTemplate\"\n                [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n    </ng-container>\n\n    <ng-container *ngIf=\"showNoItemsFound()\">\n        <ng-template #defaultNotFoundTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{notFoundText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"notFoundTemplate || defaultNotFoundTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"showTypeToSearch()\">\n        <ng-template #defaultTypeToSearchTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{typeToSearchText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"typeToSearchTemplate || defaultTypeToSearchTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"loading && itemsList.filteredItems.length === 0\">\n        <ng-template #defaultLoadingTextTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{loadingText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingTextTemplate || defaultLoadingTextTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n</ng-dropdown-panel>\n", styles: ["@charset \"UTF-8\";.ng-select{position:relative;display:block;box-sizing:border-box}.ng-select div,.ng-select input,.ng-select span{box-sizing:border-box}.ng-select [hidden]{display:none}.ng-select.ng-select-searchable .ng-select-container .ng-value-container .ng-input{opacity:1}.ng-select.ng-select-opened .ng-select-container{z-index:1001}.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-placeholder,.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-value{-webkit-user-select:none;user-select:none;cursor:default}.ng-select.ng-select-disabled .ng-arrow-wrapper{cursor:default}.ng-select.ng-select-filtered .ng-placeholder{display:none}.ng-select .ng-select-container{cursor:default;display:flex;outline:none;overflow:hidden;position:relative;width:100%}.ng-select .ng-select-container .ng-value-container{display:flex;flex:1}.ng-select .ng-select-container .ng-value-container .ng-input{opacity:0}.ng-select .ng-select-container .ng-value-container .ng-input>input{box-sizing:content-box;background:none transparent;border:0 none;box-shadow:none;outline:none;padding:0;cursor:default;width:100%}.ng-select .ng-select-container .ng-value-container .ng-input>input::-ms-clear{display:none}.ng-select .ng-select-container .ng-value-container .ng-input>input[readonly]{-webkit-user-select:none;user-select:none;width:0;padding:0}.ng-select.ng-select-single.ng-select-filtered .ng-select-container .ng-value-container .ng-value{visibility:hidden}.ng-select.ng-select-single .ng-select-container .ng-value-container,.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-input{position:absolute;left:0;width:100%}.ng-select.ng-select-multiple.ng-select-disabled>.ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container{flex-wrap:wrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{position:absolute}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value{white-space:nowrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value.ng-value-disabled .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon{cursor:pointer}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-input{flex:1;z-index:2}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{z-index:1}.ng-select .ng-clear-wrapper{cursor:pointer;position:relative;width:17px;-webkit-user-select:none;user-select:none}.ng-select .ng-clear-wrapper .ng-clear{display:inline-block;font-size:18px;line-height:1;pointer-events:none}.ng-select .ng-spinner-loader{border-radius:50%;width:17px;height:17px;margin-right:5px;font-size:10px;position:relative;text-indent:-9999em;border-top:2px solid rgba(66,66,66,.2);border-right:2px solid rgba(66,66,66,.2);border-bottom:2px solid rgba(66,66,66,.2);border-left:2px solid #424242;transform:translateZ(0);animation:load8 .8s infinite linear}.ng-select .ng-spinner-loader:after{border-radius:50%;width:17px;height:17px}@keyframes load8{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.ng-select .ng-arrow-wrapper{cursor:pointer;position:relative;text-align:center;-webkit-user-select:none;user-select:none}.ng-select .ng-arrow-wrapper .ng-arrow{pointer-events:none;display:inline-block;height:0;width:0;position:relative}.ng-dropdown-panel{box-sizing:border-box;position:absolute;opacity:0;width:100%;z-index:1050;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .ng-dropdown-panel-items{display:block;height:auto;box-sizing:border-box;max-height:240px;overflow-y:auto}.ng-dropdown-panel .ng-dropdown-panel-items .ng-optgroup{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option{box-sizing:border-box;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .ng-option-label:empty:before{content:\"\\200b\"}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .highlighted{font-weight:700;text-decoration:underline}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.disabled{cursor:default}.ng-dropdown-panel .scroll-host{overflow:hidden;overflow-y:auto;position:relative;display:block;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .scrollable-content{top:0;left:0;width:100%;height:100%;position:absolute}.ng-dropdown-panel .total-padding{width:1px;opacity:0}\n"] }]
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Attribute,
                    args: ['class']
                }] }, { type: undefined, decorators: [{
                    type: Attribute,
                    args: ['autofocus']
                }] }, { type: i1.NgSelectConfig }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [SELECTION_MODEL_FACTORY]
                }] }, { type: i0.ElementRef }, { type: i0.ChangeDetectorRef }, { type: i2.ConsoleService }]; }, propDecorators: { bindLabel: [{
                type: Input
            }], bindValue: [{
                type: Input
            }], markFirst: [{
                type: Input
            }], placeholder: [{
                type: Input
            }], notFoundText: [{
                type: Input
            }], typeToSearchText: [{
                type: Input
            }], addTagText: [{
                type: Input
            }], loadingText: [{
                type: Input
            }], clearAllText: [{
                type: Input
            }], appearance: [{
                type: Input
            }], dropdownPosition: [{
                type: Input
            }], appendTo: [{
                type: Input
            }], loading: [{
                type: Input
            }], closeOnSelect: [{
                type: Input
            }], hideSelected: [{
                type: Input
            }], selectOnTab: [{
                type: Input
            }], openOnEnter: [{
                type: Input
            }], maxSelectedItems: [{
                type: Input
            }], groupBy: [{
                type: Input
            }], groupValue: [{
                type: Input
            }], bufferAmount: [{
                type: Input
            }], virtualScroll: [{
                type: Input
            }], selectableGroup: [{
                type: Input
            }], selectableGroupAsModel: [{
                type: Input
            }], searchFn: [{
                type: Input
            }], trackByFn: [{
                type: Input
            }], clearOnBackspace: [{
                type: Input
            }], labelForId: [{
                type: Input
            }], inputAttrs: [{
                type: Input
            }], tabIndex: [{
                type: Input
            }], readonly: [{
                type: Input
            }], searchWhileComposing: [{
                type: Input
            }], minTermLength: [{
                type: Input
            }], editableSearchTerm: [{
                type: Input
            }], keyDownFn: [{
                type: Input
            }], searchable: [{
                type: Input
            }], useSearchInPanel: [{
                type: Input
            }], typeahead: [{
                type: Input
            }, {
                type: HostBinding,
                args: ['class.ng-select-typeahead']
            }], multiple: [{
                type: Input
            }, {
                type: HostBinding,
                args: ['class.ng-select-multiple']
            }], addTag: [{
                type: Input
            }, {
                type: HostBinding,
                args: ['class.ng-select-taggable']
            }], clearable: [{
                type: Input
            }, {
                type: HostBinding,
                args: ['class.ng-select-clearable']
            }], isOpen: [{
                type: Input
            }, {
                type: HostBinding,
                args: ['class.ng-select-opened']
            }], items: [{
                type: Input
            }], compareWith: [{
                type: Input
            }], clearSearchOnAdd: [{
                type: Input
            }], blurEvent: [{
                type: Output,
                args: ['blur']
            }], focusEvent: [{
                type: Output,
                args: ['focus']
            }], changeEvent: [{
                type: Output,
                args: ['change']
            }], openEvent: [{
                type: Output,
                args: ['open']
            }], closeEvent: [{
                type: Output,
                args: ['close']
            }], searchEvent: [{
                type: Output,
                args: ['search']
            }], clearEvent: [{
                type: Output,
                args: ['clear']
            }], addEvent: [{
                type: Output,
                args: ['add']
            }], removeEvent: [{
                type: Output,
                args: ['remove']
            }], scroll: [{
                type: Output,
                args: ['scroll']
            }], scrollToEnd: [{
                type: Output,
                args: ['scrollToEnd']
            }], optionTemplate: [{
                type: ContentChild,
                args: [NgOptionTemplateDirective, { read: TemplateRef }]
            }], optgroupTemplate: [{
                type: ContentChild,
                args: [NgOptgroupTemplateDirective, { read: TemplateRef }]
            }], labelTemplate: [{
                type: ContentChild,
                args: [NgLabelTemplateDirective, { read: TemplateRef }]
            }], multiLabelTemplate: [{
                type: ContentChild,
                args: [NgMultiLabelTemplateDirective, { read: TemplateRef }]
            }], headerTemplate: [{
                type: ContentChild,
                args: [NgHeaderTemplateDirective, { read: TemplateRef }]
            }], footerTemplate: [{
                type: ContentChild,
                args: [NgFooterTemplateDirective, { read: TemplateRef }]
            }], notFoundTemplate: [{
                type: ContentChild,
                args: [NgNotFoundTemplateDirective, { read: TemplateRef }]
            }], typeToSearchTemplate: [{
                type: ContentChild,
                args: [NgTypeToSearchTemplateDirective, { read: TemplateRef }]
            }], loadingTextTemplate: [{
                type: ContentChild,
                args: [NgLoadingTextTemplateDirective, { read: TemplateRef }]
            }], tagTemplate: [{
                type: ContentChild,
                args: [NgTagTemplateDirective, { read: TemplateRef }]
            }], loadingSpinnerTemplate: [{
                type: ContentChild,
                args: [NgLoadingSpinnerTemplateDirective, { read: TemplateRef }]
            }], headerSearchInput: [{
                type: ViewChild,
                args: ['headerSearchInput', { static: false }]
            }], dropdownPanel: [{
                type: ViewChild,
                args: [forwardRef(() => NgDropdownPanelComponent)]
            }], searchInput: [{
                type: ViewChild,
                args: ['searchInput', { static: true }]
            }], ngOptions: [{
                type: ContentChildren,
                args: [NgOptionComponent, { descendants: true }]
            }], useDefaultClass: [{
                type: HostBinding,
                args: ['class.ng-select']
            }], disabled: [{
                type: HostBinding,
                args: ['class.ng-select-disabled']
            }], filtered: [{
                type: HostBinding,
                args: ['class.ng-select-filtered']
            }], single: [{
                type: HostBinding,
                args: ['class.ng-select-single']
            }], searchableNoPanel: [{
                type: HostBinding,
                args: ['class.ng-select-searchable']
            }], handleKeyDown: [{
                type: HostListener,
                args: ['keydown', ['$event']]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctc2VsZWN0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9uZy1zZWxlY3QvbGliL25nLXNlbGVjdC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9zcmMvbmctc2VsZWN0L2xpYi9uZy1zZWxlY3QuY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNILFNBQVMsRUFLVCxVQUFVLEVBRVYsS0FBSyxFQUNMLE1BQU0sRUFDTixZQUFZLEVBQ1osWUFBWSxFQUNaLFdBQVcsRUFDWCxpQkFBaUIsRUFDakIsWUFBWSxFQUNaLFdBQVcsRUFDWCxTQUFTLEVBRVQsdUJBQXVCLEVBQ3ZCLE1BQU0sRUFFTixlQUFlLEVBRWYsY0FBYyxFQUNkLFNBQVMsRUFDWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQXdCLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFdEMsT0FBTyxFQUNILHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLHlCQUF5QixFQUN6QiwyQkFBMkIsRUFDM0IsMkJBQTJCLEVBQzNCLCtCQUErQixFQUMvQiw4QkFBOEIsRUFDOUIsNkJBQTZCLEVBQzdCLHNCQUFzQixFQUN0QixpQ0FBaUMsRUFDcEMsTUFBTSwwQkFBMEIsQ0FBQztBQUdsQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDekMsT0FBTyxFQUFZLE9B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QUFNO3NCQUFoRCxXQUFXO3VCQUFDLHdCQUF3QjtnQkFFVSxpQkFBaUI7c0JBQS9ELFdBQVc7dUJBQUMsNEJBQTRCO2dCQXNHekMsYUFBYTtzQkFEWixZQUFZO3VCQUFDLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgQ29tcG9uZW50LFxuICAgIE9uQ2hhbmdlcyxcbiAgICBPbkRlc3Ryb3ksXG4gICAgT25Jbml0LFxuICAgIEFmdGVyVmlld0luaXQsXG4gICAgZm9yd2FyZFJlZixcbiAgICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgICBJbnB1dCxcbiAgICBPdXRwdXQsXG4gICAgRXZlbnRFbWl0dGVyLFxuICAgIENvbnRlbnRDaGlsZCxcbiAgICBUZW1wbGF0ZVJlZixcbiAgICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgICBIb3N0TGlzdGVuZXIsXG4gICAgSG9zdEJpbmRpbmcsXG4gICAgVmlld0NoaWxkLFxuICAgIEVsZW1lbnRSZWYsXG4gICAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gICAgSW5qZWN0LFxuICAgIFNpbXBsZUNoYW5nZXMsXG4gICAgQ29udGVudENoaWxkcmVuLFxuICAgIFF1ZXJ5TGlzdCxcbiAgICBJbmplY3Rpb25Ub2tlbixcbiAgICBBdHRyaWJ1dGVcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb250cm9sVmFsdWVBY2Nlc3NvciwgTkdfVkFMVUVfQUNDRVNTT1IgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyB0YWtlVW50aWwsIHN0YXJ0V2l0aCwgdGFwLCBkZWJvdW5jZVRpbWUsIG1hcCwgZmlsdGVyIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgU3ViamVjdCwgbWVyZ2UgfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtcbiAgICBOZ09wdGlvblRlbXBsYXRlRGlyZWN0aXZlLFxuICAgIE5nTGFiZWxUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ0hlYWRlclRlbXBsYXRlRGlyZWN0aXZlLFxuICAgIE5nRm9vdGVyVGVtcGxhdGVEaXJlY3RpdmUsXG4gICAgTmdPcHRncm91cFRlbXBsYXRlRGlyZWN0aXZlLFxuICAgIE5nTm90Rm91bmRUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ1R5cGVUb1NlYXJjaFRlbXBsYXRlRGlyZWN0aXZlLFxuICAgIE5nTG9hZGluZ1RleHRUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ011bHRpTGFiZWxUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ1RhZ1RlbXBsYXRlRGlyZWN0aXZlLFxuICAgIE5nTG9hZGluZ1NwaW5uZXJUZW1wbGF0ZURpcmVjdGl2ZVxufSBmcm9tICcuL25nLXRlbXBsYXRlcy5kaXJlY3RpdmUnO1xuXG5pbXBvcnQgeyBDb25zb2xlU2VydmljZSB9IGZyb20gJy4vY29uc29sZS5zZXJ2aWNlJztcbmltcG9ydCB7IGlzRGVmaW5lZCwgaXNGdW5jdGlvbiwgaXNQcm9taXNlLCBpc09iamVjdCB9IGZyb20gJy4vdmFsdWUtdXRpbHMnO1xuaW1wb3J0IHsgSXRlbXNMaXN0IH0gZnJvbSAnLi9pdGVtcy1saXN0JztcbmltcG9ydCB7IE5nT3B0aW9uLCBLZXlDb2RlLCBEcm9wZG93blBvc2l0aW9uIH0gZnJvbSAnLi9uZy1zZWxlY3QudHlwZXMnO1xuaW1wb3J0IHsgbmV3SWQgfSBmcm9tICcuL2lkJztcbmltcG9ydCB7IE5nRHJvcGRvd25QYW5lbENvbXBvbmVudCB9IGZyb20gJy4vbmctZHJvcGRvd24tcGFuZWwuY29tcG9uZW50JztcbmltcG9ydCB7IE5nT3B0aW9uQ29tcG9uZW50IH0gZnJvbSAnLi9uZy1vcHRpb24uY29tcG9uZW50JztcbmltcG9ydCB7IFNlbGVjdGlvbk1vZGVsRmFjdG9yeSB9IGZyb20gJy4vc2VsZWN0aW9uLW1vZGVsJztcbmltcG9ydCB7IE5nU2VsZWN0Q29uZmlnIH0gZnJvbSAnLi9jb25maWcuc2VydmljZSc7XG5pbXBvcnQgeyBOZ0Ryb3Bkb3duUGFuZWxTZXJ2aWNlIH0gZnJvbSAnLi9uZy1kcm9wZG93bi1wYW5lbC5zZXJ2aWNlJztcblxuZXhwb3J0IGNvbnN0IFNFTEVDVElPTl9NT0RFTF9GQUNUT1JZID0gbmV3IEluamVjdGlvblRva2VuPFNlbGVjdGlvbk1vZGVsRmFjdG9yeT4oJ25nLXNlbGVjdC1zZWxlY3Rpb24tbW9kZWwnKTtcbmV4cG9ydCB0eXBlIEFkZFRhZ0ZuID0gKCh0ZXJtOiBzdHJpbmcpID0+IGFueSB8IFByb21pc2U8YW55Pik7XG5leHBvcnQgdHlwZSBDb21wYXJlV2l0aEZuID0gKGE6IGFueSwgYjogYW55KSA9PiBib29sZWFuO1xuZXhwb3J0IHR5cGUgR3JvdXBWYWx1ZUZuID0gKGtleTogc3RyaW5nIHwgYW55LCBjaGlsZHJlbjogYW55W10pID0+IHN0cmluZyB8IGFueTtcblxuQENvbXBvbmVudCh7XG4gICAgc2VsZWN0b3I6ICduZy1zZWxlY3QnLFxuICAgIHRlbXBsYXRlVXJsOiAnLi9uZy1zZWxlY3QuY29tcG9uZW50Lmh0bWwnLFxuICAgIHN0eWxlVXJsczogWycuL25nLXNlbGVjdC5jb21wb25lbnQuc2NzcyddLFxuICAgIHByb3ZpZGVyczogW3tcbiAgICAgICAgcHJvdmlkZTogTkdfVkFMVUVfQUNDRVNTT1IsXG4gICAgICAgIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IE5nU2VsZWN0Q29tcG9uZW50KSxcbiAgICAgICAgbXVsdGk6IHRydWVcbiAgICB9LCBOZ0Ryb3Bkb3duUGFuZWxTZXJ2aWNlXSxcbiAgICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICAgIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxufSlcbmV4cG9ydCBjbGFzcyBOZ1NlbGVjdENvbXBvbmVudCBpbXBsZW1lbnRzIE9uRGVzdHJveSwgT25DaGFuZ2VzLCBPbkluaXQsIEFmdGVyVmlld0luaXQsIENvbnRyb2xWYWx1ZUFjY2Vzc29yIHtcblxuICAgIEBJbnB1dCgpIGJpbmRMYWJlbDogc3RyaW5nO1xuICAgIEBJbnB1dCgpIGJpbmRWYWx1ZTogc3RyaW5nO1xuICAgIEBJbnB1dCgpIG1hcmtGaXJzdCA9IHRydWU7XG4gICAgQElucHV0KCkgcGxhY2Vob2xkZXI6IHN0cmluZztcbiAgICBASW5wdXQoKSBub3RGb3VuZFRleHQ6IHN0cmluZztcbiAgICBASW5wdXQoKSB0eXBlVG9TZWFyY2hUZXh0OiBzdHJpbmc7XG4gICAgQElucHV0KCkgYWRkVGFnVGV4dDogc3RyaW5nO1xuICAgIEBJbnB1dCgpIGxvYWRpbmdUZXh0OiBzdHJpbmc7XG4gICAgQElucHV0KCkgY2xlYXJBbGxUZXh0OiBzdHJpbmc7XG4gICAgQElucHV0KCkgYXBwZWFyYW5jZTogc3RyaW5nO1xuICAgIEBJbnB1dCgpIGRyb3Bkb3duUG9zaXRpb246IERyb3Bkb3duUG9zaXRpb24gPSAnYXV0byc7XG4gICAgQElucHV0KCkgYXBwZW5kVG86IHN0cmluZztcbiAgICBASW5wdXQoKSBsb2FkaW5nID0gZmFsc2U7XG4gICAgQElucHV0KCkgY2xvc2VPblNlbGVjdCA9IHRydWU7XG4gICAgQElucHV0KCkgaGlkZVNlbGVjdGVkID0gZmFsc2U7XG4gICAgQElucHV0KCkgc2VsZWN0T25UYWIgPSBmYWxzZTtcbiAgICBASW5wdXQoKSBvcGVuT25FbnRlcjogYm9vbGVhbjtcbiAgICBASW5wdXQoKSBtYXhTZWxlY3RlZEl0ZW1zOiBudW1iZXI7XG4gICAgQElucHV0KCkgZ3JvdXBCeTogc3RyaW5nIHwgKCh2YWx1ZTogYW55KSA9PiBhbnkpO1xuICAgIEBJbnB1dCgpIGdyb3VwVmFsdWU6IEdyb3VwVmFsdWVGbjtcbiAgICBASW5wdXQoKSBidWZmZXJBbW91bnQgPSA0O1xuICAgIEBJbnB1dCgpIHZpcnR1YWxTY3JvbGw6IGJvb2xlYW47XG4gICAgQElucHV0KCkgc2VsZWN0YWJsZUdyb3VwID0gZmFsc2U7XG4gICAgQElucHV0KCkgc2VsZWN0YWJsZUdyb3VwQXNNb2RlbCA9IHRydWU7XG4gICAgQElucHV0KCkgc2VhcmNoRm4gPSBudWxsO1xuICAgIEBJbnB1dCgpIHRyYWNrQnlGbiA9IG51bGw7XG4gICAgQElucHV0KCkgY2xlYXJPbkJhY2tzcGFjZSA9IHRydWU7XG4gICAgQElucHV0KCkgbGFiZWxGb3JJZCA9IG51bGw7XG4gICAgQElucHV0KCkgaW5wdXRBdHRyczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xuICAgIEBJbnB1dCgpIHRhYkluZGV4OiBudW1iZXI7XG4gICAgQElucHV0KCkgcmVhZG9ubHkgPSBmYWxzZTtcbiAgICBASW5wdXQoKSBzZWFyY2hXaGlsZUNvbXBvc2luZyA9IHRydWU7XG4gICAgQElucHV0KCkgbWluVGVybUxlbmd0aCA9IDA7XG4gICAgQElucHV0KCkgZWRpdGFibGVTZWFyY2hUZXJtID0gZmFsc2U7XG4gICAgQElucHV0KCkga2V5RG93bkZuID0gKF86IEtleWJvYXJkRXZlbnQpID0+IHRydWU7XG4gICAgQElucHV0KCkgc2VhcmNoYWJsZSA9IHRydWU7XG4gICAgLy8gRmxhZyBmb3IgdXNpbmcgc2VhcmNoIGlucHV0IGluIGRyb3Bkb3duIHBhbmVsLiBXaGVuIHRydWUgLSBpdCB3aWxsIGhpZGUgZGVmYXVsdCBzZWFyY2ggaW5wdXQuXG4gICAgQElucHV0KCkgdXNlU2VhcmNoSW5QYW5lbCA9IGZhbHNlO1xuXG4gICAgQElucHV0KCkgQEhvc3RCaW5kaW5nKCdjbGFzcy5uZy1zZWxlY3QtdHlwZWFoZWFkJykgdHlwZWFoZWFkOiBTdWJqZWN0PHN0cmluZz47XG4gICAgQElucHV0KCkgQEhvc3RCaW5kaW5nKCdjbGFzcy5uZy1zZWxlY3QtbXVsdGlwbGUnKSBtdWx0aXBsZSA9IGZhbHNlO1xuICAgIEBJbnB1dCgpIEBIb3N0QmluZGluZygnY2xhc3Mubmctc2VsZWN0LXRhZ2dhYmxlJykgYWRkVGFnOiBib29sZWFuIHwgQWRkVGFnRm4gPSBmYWxzZTtcbiAgICBASW5wdXQoKSBASG9zdEJpbmRpbmcoJ2NsYXNzLm5nLXNlbGVjdC1jbGVhcmFibGUnKSBjbGVhcmFibGUgPSB0cnVlO1xuICAgIEBJbnB1dCgpIEBIb3N0QmluZGluZygnY2xhc3Mubmctc2VsZWN0LW9wZW5lZCcpIGlzT3BlbiA9IGZhbHNlO1xuXG4gICAgQElucHV0KClcbiAgICBnZXQgaXRlbXMoKSB7IHJldHVybiB0aGlzLl9pdGVtcyB9O1xuXG4gICAgc2V0IGl0ZW1zKHZhbHVlOiBhbnlbXSB8IG51bGwpIHtcbiAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2l0ZW1zQXJlVXNlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2l0ZW1zID0gdmFsdWU7XG4gICAgfTtcblxuICAgIEBJbnB1dCgpXG4gICAgZ2V0IGNvbXBhcmVXaXRoKCkgeyByZXR1cm4gdGhpcy5fY29tcGFyZVdpdGg7IH1cblxuICAgIHNldCBjb21wYXJlV2l0aChmbjogQ29tcGFyZVdpdGhGbikge1xuICAgICAgICBpZiAoZm4gIT09IHVuZGVmaW5lZCAmJiBmbiAhPT0gbnVsbCAmJiAhaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdgY29tcGFyZVdpdGhgIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jb21wYXJlV2l0aCA9IGZuO1xuICAgIH1cblxuICAgIEBJbnB1dCgpXG4gICAgZ2V0IGNsZWFyU2VhcmNoT25BZGQoKSB7XG4gICAgICAgIGlmIChpc0RlZmluZWQodGhpcy5fY2xlYXJTZWFyY2hPbkFkZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jbGVhclNlYXJjaE9uQWRkO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZCh0aGlzLmNvbmZpZy5jbGVhclNlYXJjaE9uQWRkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmNsZWFyU2VhcmNoT25BZGQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2VPblNlbGVjdDtcbiAgICB9O1xuXG4gICAgc2V0IGNsZWFyU2VhcmNoT25BZGQodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fY2xlYXJTZWFyY2hPbkFkZCA9IHZhbHVlO1xuICAgIH07XG5cbiAgICAvLyBvdXRwdXQgZXZlbnRzXG4gICAgQE91dHB1dCgnYmx1cicpIGJsdXJFdmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICBAT3V0cHV0KCdmb2N1cycpIGZvY3VzRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgnY2hhbmdlJykgY2hhbmdlRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgnb3BlbicpIG9wZW5FdmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICBAT3V0cHV0KCdjbG9zZScpIGNsb3NlRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgnc2VhcmNoJykgc2VhcmNoRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPHsgdGVybTogc3RyaW5nLCBpdGVtczogYW55W10gfT4oKTtcbiAgICBAT3V0cHV0KCdjbGVhcicpIGNsZWFyRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgnYWRkJykgYWRkRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgncmVtb3ZlJykgcmVtb3ZlRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgnc2Nyb2xsJykgc2Nyb2xsID0gbmV3IEV2ZW50RW1pdHRlcjx7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH0+KCk7XG4gICAgQE91dHB1dCgnc2Nyb2xsVG9FbmQnKSBzY3JvbGxUb0VuZCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIC8vIGN1c3RvbSB0ZW1wbGF0ZXNcbiAgICBAQ29udGVudENoaWxkKE5nT3B0aW9uVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgb3B0aW9uVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ09wdGdyb3VwVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgb3B0Z3JvdXBUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBAQ29udGVudENoaWxkKE5nTGFiZWxUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KSBsYWJlbFRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICAgIEBDb250ZW50Q2hpbGQoTmdNdWx0aUxhYmVsVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgbXVsdGlMYWJlbFRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICAgIEBDb250ZW50Q2hpbGQoTmdIZWFkZXJUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KSBoZWFkZXJUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBAQ29udGVudENoaWxkKE5nRm9vdGVyVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgZm9vdGVyVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ05vdEZvdW5kVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgbm90Rm91bmRUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBAQ29udGVudENoaWxkKE5nVHlwZVRvU2VhcmNoVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgdHlwZVRvU2VhcmNoVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ0xvYWRpbmdUZXh0VGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgbG9hZGluZ1RleHRUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBAQ29udGVudENoaWxkKE5nVGFnVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgdGFnVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ0xvYWRpbmdTcGlubmVyVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgbG9hZGluZ1NwaW5uZXJUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcblxuICAgIEBWaWV3Q2hpbGQoJ2hlYWRlclNlYXJjaElucHV0Jywge3N0YXRpYzogZmFsc2V9KSBoZWFkZXJTZWFyY2hJbnB1dDogRWxlbWVudFJlZjxIVE1MSW5wdXRFbGVtZW50PjtcbiAgICBAVmlld0NoaWxkKGZvcndhcmRSZWYoKCkgPT4gTmdEcm9wZG93blBhbmVsQ29tcG9uZW50KSkgZHJvcGRvd25QYW5lbDogTmdEcm9wZG93blBhbmVsQ29tcG9uZW50O1xuICAgIEBWaWV3Q2hpbGQoJ3NlYXJjaElucHV0JywgeyBzdGF0aWM6IHRydWUgfSkgc2VhcmNoSW5wdXQ6IEVsZW1lbnRSZWY8SFRNTElucHV0RWxlbWVudD47XG4gICAgQENvbnRlbnRDaGlsZHJlbihOZ09wdGlvbkNvbXBvbmVudCwgeyBkZXNjZW5kYW50czogdHJ1ZSB9KSBuZ09wdGlvbnM6IFF1ZXJ5TGlzdDxOZ09wdGlvbkNvbXBvbmVudD47XG5cbiAgICBASG9zdEJpbmRpbmcoJ2NsYXNzLm5nLXNlbGVjdCcpIHVzZURlZmF1bHRDbGFzcyA9IHRydWU7XG5cbiAgICBASG9zdEJpbmRpbmcoJ2NsYXNzLm5nLXNlbGVjdC1kaXNhYmxlZCcpIGdldCBkaXNhYmxlZCgpIHsgcmV0dXJuIHRoaXMucmVhZG9ubHkgfHwgdGhpcy5fZGlzYWJsZWQgfTtcblxuICAgIEBIb3N0QmluZGluZygnY2xhc3Mubmctc2VsZWN0LWZpbHRlcmVkJykgZ2V0IGZpbHRlcmVkKCkgeyByZXR1cm4gKCEhdGhpcy5zZWFyY2hUZXJtICYmIHRoaXMuc2VhcmNoYWJsZSB8fCB0aGlzLl9pc0NvbXBvc2luZykgfTtcblxuICAgIEBIb3N0QmluZGluZygnY2xhc3Mubmctc2VsZWN0LXNpbmdsZScpIGdldCBzaW5nbGUoKSB7IHJldHVybiAhdGhpcy5tdWx0aXBsZSB9O1xuXG4gICAgQEhvc3RCaW5kaW5nKCdjbGFzcy5uZy1zZWxlY3Qtc2VhcmNoYWJsZScpIGdldCBzZWFyY2hhYmxlTm9QYW5lbCgpIHsgcmV0dXJuICF0aGlzLnNlYXJjaGFibGUgJiYgIXRoaXMudXNlU2VhcmNoSW5QYW5lbCB9O1xuXG4gICAgaXRlbXNMaXN0OiBJdGVtc0xpc3Q7XG4gICAgdmlld1BvcnRJdGVtczogTmdPcHRpb25bXSA9IFtdO1xuICAgIHNlYXJjaFRlcm06IHN0cmluZyA9IG51bGw7XG4gICAgZHJvcGRvd25JZCA9IG5ld0lkKCk7XG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQ7XG4gICAgZm9jdXNlZDogYm9vbGVhbjtcbiAgICBlc2NhcGVIVE1MID0gdHJ1ZTtcblxuICAgIHByaXZhdGUgX2l0ZW1zID0gW107XG4gICAgcHJpdmF0ZSBfaXRlbXNBcmVVc2VkOiBib29sZWFuO1xuICAgIHByaXZhdGUgX2RlZmF1bHRMYWJlbCA9ICdsYWJlbCc7XG4gICAgcHJpdmF0ZSBfcHJpbWl0aXZlO1xuICAgIHByaXZhdGUgX21hbnVhbE9wZW46IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBfZGlzYWJsZWQ6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBfcHJlc3NlZEtleXM6IHN0cmluZ1tdID0gW107XG4gICAgcHJpdmF0ZSBfY29tcGFyZVdpdGg6IENvbXBhcmVXaXRoRm47XG4gICAgcHJpdmF0ZSBfY2xlYXJTZWFyY2hPbkFkZDogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9pc0NvbXBvc2luZyA9IGZhbHNlO1xuXG4gICAgcHJpdmF0ZSBnZXQgX2VkaXRhYmxlU2VhcmNoVGVybSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWRpdGFibGVTZWFyY2hUZXJtICYmICF0aGlzLm11bHRpcGxlO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Rlc3Ryb3kkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9rZXlQcmVzcyQgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgcHJpdmF0ZSBfb25DaGFuZ2UgPSAoXzogYW55KSA9PiB7IH07XG4gICAgcHJpdmF0ZSBfb25Ub3VjaGVkID0gKCkgPT4geyB9O1xuXG4gICAgY2xlYXJJdGVtID0gKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBvcHRpb24gPSB0aGlzLnNlbGVjdGVkSXRlbXMuZmluZCh4ID0+IHgudmFsdWUgPT09IGl0ZW0pO1xuICAgICAgICB0aGlzLnVuc2VsZWN0KG9wdGlvbik7XG4gICAgfTtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBAQXR0cmlidXRlKCdjbGFzcycpIHB1YmxpYyBjbGFzc2VzOiBzdHJpbmcsXG4gICAgICAgIEBBdHRyaWJ1dGUoJ2F1dG9mb2N1cycpIHByaXZhdGUgYXV0b0ZvY3VzOiBhbnksXG4gICAgICAgIHB1YmxpYyBjb25maWc6IE5nU2VsZWN0Q29uZmlnLFxuICAgICAgICBASW5qZWN0KFNFTEVDVElPTl9NT0RFTF9GQUNUT1JZKSBuZXdTZWxlY3Rpb25Nb2RlbDogU2VsZWN0aW9uTW9kZWxGYWN0b3J5LFxuICAgICAgICBfZWxlbWVudFJlZjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4sXG4gICAgICAgIHByaXZhdGUgX2NkOiBDaGFuZ2VEZXRlY3RvclJlZixcbiAgICAgICAgcHJpdmF0ZSBfY29uc29sZTogQ29uc29sZVNlcnZpY2VcbiAgICApIHtcbiAgICAgICAgdGhpcy5fbWVyZ2VHbG9iYWxDb25maWcoY29uZmlnKTtcbiAgICAgICAgdGhpcy5pdGVtc0xpc3QgPSBuZXcgSXRlbXNMaXN0KHRoaXMsIG5ld1NlbGVjdGlvbk1vZGVsKCkpO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBfZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50O1xuICAgIH1cblxuICAgIGdldCBzZWxlY3RlZEl0ZW1zKCk6IE5nT3B0aW9uW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5pdGVtc0xpc3Quc2VsZWN0ZWRJdGVtcztcbiAgICB9XG5cbiAgICBnZXQgc2VsZWN0ZWRWYWx1ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdGVkSXRlbXMubWFwKHggPT4geC52YWx1ZSk7XG4gICAgfVxuXG4gICAgZ2V0IGhhc1ZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDA7XG4gICAgfVxuXG4gICAgZ2V0IGN1cnJlbnRQYW5lbFBvc2l0aW9uKCk6IERyb3Bkb3duUG9zaXRpb24ge1xuICAgICAgICBpZiAodGhpcy5kcm9wZG93blBhbmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kcm9wZG93blBhbmVsLmN1cnJlbnRQb3NpdGlvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIG5nT25Jbml0KCkge1xuICAgICAgICB0aGlzLl9oYW5kbGVLZXlQcmVzc2VzKCk7XG4gICAgICAgIHRoaXMuX3NldElucHV0QXR0cmlidXRlcygpO1xuICAgIH1cblxuICAgIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICAgICAgaWYgKGNoYW5nZXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LmNsZWFyU2VsZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hhbmdlcy5pdGVtcykge1xuICAgICAgICAgICAgdGhpcy5fc2V0SXRlbXMoY2hhbmdlcy5pdGVtcy5jdXJyZW50VmFsdWUgfHwgW10pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VzLmlzT3Blbikge1xuICAgICAgICAgICAgdGhpcy5fbWFudWFsT3BlbiA9IGlzRGVmaW5lZChjaGFuZ2VzLmlzT3Blbi5jdXJyZW50VmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmdBZnRlclZpZXdJbml0KCkge1xuICAgICAgICBpZiAoIXRoaXMuX2l0ZW1zQXJlVXNlZCkge1xuICAgICAgICAgICAgdGhpcy5lc2NhcGVIVE1MID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9zZXRJdGVtc0Zyb21OZ09wdGlvbnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0RlZmluZWQodGhpcy5hdXRvRm9jdXMpKSB7XG4gICAgICAgICAgICB0aGlzLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZ09uRGVzdHJveSgpIHtcbiAgICAgICAgdGhpcy5fZGVzdHJveSQubmV4dCgpO1xuICAgICAgICB0aGlzLl9kZXN0cm95JC5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIEBIb3N0TGlzdGVuZXIoJ2tleWRvd24nLCBbJyRldmVudCddKVxuICAgIGhhbmRsZUtleURvd24oJGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgICAgIGNvbnN0IGtleUNvZGUgPSBLZXlDb2RlWyRldmVudC53aGljaF07XG4gICAgICAgIGlmIChrZXlDb2RlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5rZXlEb3duRm4oJGV2ZW50KSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUtleUNvZGUoJGV2ZW50KVxuICAgICAgICB9IGVsc2UgaWYgKCRldmVudC5rZXkgJiYgJGV2ZW50LmtleS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2tleVByZXNzJC5uZXh0KCRldmVudC5rZXkudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBoYW5kbGVLZXlDb2RlKCRldmVudDogS2V5Ym9hcmRFdmVudCkge1xuICAgICAgICBzd2l0Y2ggKCRldmVudC53aGljaCkge1xuICAgICAgICBjYXNlIEtleUNvZGUuQXJyb3dEb3duOlxuICAgICAgICAgICAgdGhpcy5faGFuZGxlQXJyb3dEb3duKCRldmVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBLZXlDb2RlLkFycm93VXA6XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVBcnJvd1VwKCRldmVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBLZXlDb2RlLlNwYWNlOlxuICAgICAgICAgICAgdGhpcy5faGFuZGxlU3BhY2UoJGV2ZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEtleUNvZGUuRW50ZXI6XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVFbnRlcigkZXZlbnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgS2V5Q29kZS5UYWI6XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVUYWIoJGV2ZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEtleUNvZGUuRXNjOlxuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBLZXlDb2RlLkJhY2tzcGFjZTpcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZUJhY2tzcGFjZSgpO1xuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhhbmRsZU1vdXNlZG93bigkZXZlbnQ6IE1vdXNlRXZlbnQpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gJGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgaWYgKHRhcmdldC50YWdOYW1lICE9PSAnSU5QVVQnKSB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCduZy1jbGVhci13cmFwcGVyJykpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlQ2xlYXJDbGljaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ25nLWFycm93LXdyYXBwZXInKSkge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVBcnJvd0NsaWNrKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnbmctdmFsdWUtaWNvbicpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuZm9jdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2VhcmNoYWJsZSkge1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRvZ2dsZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaGFuZGxlQXJyb3dDbGljaygpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNPcGVuKSB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhhbmRsZUNsZWFyQ2xpY2soKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc1ZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5jbGVhclNlbGVjdGVkKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlTmdNb2RlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NsZWFyU2VhcmNoKCk7XG4gICAgICAgIHRoaXMuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5jbGVhckV2ZW50LmVtaXQoKTtcblxuICAgICAgICB0aGlzLl9vblNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICB9XG5cbiAgICBjbGVhck1vZGVsKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xlYXJhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pdGVtc0xpc3QuY2xlYXJTZWxlY3RlZCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVOZ01vZGVsKCk7XG4gICAgfVxuXG4gICAgd3JpdGVWYWx1ZSh2YWx1ZTogYW55IHwgYW55W10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5pdGVtc0xpc3QuY2xlYXJTZWxlY3RlZCgpO1xuICAgICAgICB0aGlzLl9oYW5kbGVXcml0ZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fY2QubWFya0ZvckNoZWNrKCk7XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJPbkNoYW5nZShmbjogYW55KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlID0gZm47XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJPblRvdWNoZWQoZm46IGFueSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9vblRvdWNoZWQgPSBmbjtcbiAgICB9XG5cbiAgICBzZXREaXNhYmxlZFN0YXRlKHN0YXRlOiBib29sZWFuKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Rpc2FibGVkID0gc3RhdGU7XG4gICAgICAgIHRoaXMuX2NkLm1hcmtGb3JDaGVjaygpO1xuICAgIH1cblxuICAgIHRvZ2dsZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT3Blbikge1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvcGVuKCkge1xuICAgICAgICBpZiAodGhpcy5kaXNhYmxlZCB8fCB0aGlzLmlzT3BlbiB8fCB0aGlzLl9tYW51YWxPcGVuIHx8IHRoaXMuaXRlbXNMaXN0Lm1heEl0ZW1zU2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5faXNUeXBlYWhlYWQgJiYgIXRoaXMuYWRkVGFnICYmIHRoaXMuaXRlbXNMaXN0Lm5vSXRlbXNUb1NlbGVjdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pdGVtc0xpc3QubWFya1NlbGVjdGVkT3JEZWZhdWx0KHRoaXMubWFya0ZpcnN0KTtcbiAgICAgICAgdGhpcy5vcGVuRXZlbnQuZW1pdCgpO1xuICAgICAgICBpZiAoIXRoaXMuc2VhcmNoVGVybSkge1xuICAgICAgICAgICAgLy8gd2FpdCBmb3IgZHJvcGRvd24gcGFuZWwgdG8gcmVuZGVyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRldGVjdENoYW5nZXMoKTtcbiAgICB9XG5cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT3BlbiB8fCB0aGlzLl9tYW51YWxPcGVuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faXNDb21wb3NpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLl9lZGl0YWJsZVNlYXJjaFRlcm0pIHtcbiAgICAgICAgICAgIHRoaXMuX2NsZWFyU2VhcmNoKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5jbGVhclNlYXJjaE9uQWRkKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5yZXNldEZpbHRlcmVkSXRlbXMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLml0ZW1zTGlzdC51bm1hcmtJdGVtKCk7XG4gICAgICAgIHRoaXMuX29uVG91Y2hlZCgpO1xuICAgICAgICB0aGlzLmNsb3NlRXZlbnQuZW1pdCgpO1xuICAgICAgICB0aGlzLl9jZC5tYXJrRm9yQ2hlY2soKTtcbiAgICB9XG5cbiAgICB0b2dnbGVJdGVtKGl0ZW06IE5nT3B0aW9uKSB7XG4gICAgICAgIGlmICghaXRlbSB8fCBpdGVtLmRpc2FibGVkIHx8IHRoaXMuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLm11bHRpcGxlICYmIGl0ZW0uc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudW5zZWxlY3QoaXRlbSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9lZGl0YWJsZVNlYXJjaFRlcm0pIHtcbiAgICAgICAgICAgIHRoaXMuX3NldFNlYXJjaFRlcm1Gcm9tSXRlbXMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX29uU2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgIH1cblxuICAgIHNlbGVjdChpdGVtOiBOZ09wdGlvbikge1xuICAgICAgICBpZiAoIWl0ZW0uc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LnNlbGVjdChpdGVtKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmNsZWFyU2VhcmNoT25BZGQgJiYgIXRoaXMuX2VkaXRhYmxlU2VhcmNoVGVybSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NsZWFyU2VhcmNoKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZU5nTW9kZWwoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRFdmVudC5lbWl0KGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY2xvc2VPblNlbGVjdCB8fCB0aGlzLml0ZW1zTGlzdC5ub0l0ZW1zVG9TZWxlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvY3VzKCkge1xuICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXMudXNlU2VhcmNoSW5QYW5lbCA/IHRoaXMuaGVhZGVyU2VhcmNoSW5wdXQgOiB0aGlzLnNlYXJjaElucHV0O1xuICAgICAgICBpZiAoaW5wdXQpIHtcbiAgICAgICAgICAgIGlucHV0Lm5hdGl2ZUVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGJsdXIoKSB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcy51c2VTZWFyY2hJblBhbmVsID8gdGhpcy5oZWFkZXJTZWFyY2hJbnB1dCA6IHRoaXMuc2VhcmNoSW5wdXQ7XG4gICAgICAgIGlmIChpbnB1dCkge1xuICAgICAgICAgICAgaW5wdXQubmF0aXZlRWxlbWVudC5ibHVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1bnNlbGVjdChpdGVtOiBOZ09wdGlvbikge1xuICAgICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXRlbXNMaXN0LnVuc2VsZWN0KGl0ZW0pO1xuICAgICAgICB0aGlzLmZvY3VzKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZU5nTW9kZWwoKTtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudC5lbWl0KGl0ZW0pO1xuICAgIH1cblxuICAgIHNlbGVjdFRhZygpIHtcbiAgICAgICAgbGV0IHRhZztcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24odGhpcy5hZGRUYWcpKSB7XG4gICAgICAgICAgICB0YWcgPSAodGhpcy5hZGRUYWcgYXMgQWRkVGFnRm4pKHRoaXMuc2VhcmNoVGVybSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YWcgPSB0aGlzLl9wcmltaXRpdmUgPyB0aGlzLnNlYXJjaFRlcm0gOiB7W3RoaXMuYmluZExhYmVsXTogdGhpcy5zZWFyY2hUZXJtfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhbmRsZVRhZyA9IChpdGVtKSA9PiB0aGlzLl9pc1R5cGVhaGVhZCB8fCAhdGhpcy5pc09wZW4gPyB0aGlzLml0ZW1zTGlzdC5tYXBJdGVtKGl0ZW0sIG51bGwpIDogdGhpcy5pdGVtc0xpc3QuYWRkSXRlbShpdGVtKTtcbiAgICAgICAgaWYgKGlzUHJvbWlzZSh0YWcpKSB7XG4gICAgICAgICAgICB0YWcudGhlbihpdGVtID0+IHRoaXMuc2VsZWN0KGhhbmRsZVRhZyhpdGVtKSkpLmNhdGNoKCgpID0+IHsgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGFnKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdChoYW5kbGVUYWcodGFnKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzaG93Q2xlYXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNsZWFyYWJsZSAmJiAodGhpcy5oYXNWYWx1ZSB8fCB0aGlzLnNlYXJjaFRlcm0pICYmICF0aGlzLmRpc2FibGVkO1xuICAgIH1cblxuICAgIHRyYWNrQnlPcHRpb24gPSAoXzogbnVtYmVyLCBpdGVtOiBOZ09wdGlvbikgPT4ge1xuICAgICAgICBpZiAodGhpcy50cmFja0J5Rm4pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYWNrQnlGbihpdGVtLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH07XG5cbiAgICBnZXQgc2hvd0FkZFRhZygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl92YWxpZFRlcm0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRlcm0gPSB0aGlzLnNlYXJjaFRlcm0udG9Mb3dlckNhc2UoKS50cmltKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFRhZyAmJlxuICAgICAgICAgICAgKCF0aGlzLml0ZW1zTGlzdC5maWx0ZXJlZEl0ZW1zLnNvbWUoeCA9PiB4LmxhYmVsLnRvTG93ZXJDYXNlKCkgPT09IHRlcm0pICYmXG4gICAgICAgICAgICAgICAgKCF0aGlzLmhpZGVTZWxlY3RlZCAmJiB0aGlzLmlzT3BlbiB8fCAhdGhpcy5zZWxlY3RlZEl0ZW1zLnNvbWUoeCA9PiB4LmxhYmVsLnRvTG93ZXJDYXNlKCkgPT09IHRlcm0pKSkgJiZcbiAgICAgICAgICAgICF0aGlzLmxvYWRpbmc7XG4gICAgfVxuXG4gICAgc2hvd05vSXRlbXNGb3VuZCgpIHtcbiAgICAgICAgY29uc3QgZW1wdHkgPSB0aGlzLml0ZW1zTGlzdC5maWx0ZXJlZEl0ZW1zLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgcmV0dXJuICgoZW1wdHkgJiYgIXRoaXMuX2lzVHlwZWFoZWFkICYmICF0aGlzLmxvYWRpbmcpIHx8XG4gICAgICAgICAgICAoZW1wdHkgJiYgdGhpcy5faXNUeXBlYWhlYWQgJiYgdGhpcy5fdmFsaWRUZXJtICYmICF0aGlzLmxvYWRpbmcpKSAmJlxuICAgICAgICAgICAgIXRoaXMuc2hvd0FkZFRhZztcbiAgICB9XG5cbiAgICBzaG93VHlwZVRvU2VhcmNoKCkge1xuICAgICAgICBjb25zdCBlbXB0eSA9IHRoaXMuaXRlbXNMaXN0LmZpbHRlcmVkSXRlbXMubGVuZ3RoID09PSAwO1xuICAgICAgICByZXR1cm4gZW1wdHkgJiYgdGhpcy5faXNUeXBlYWhlYWQgJiYgIXRoaXMuX3ZhbGlkVGVybSAmJiAhdGhpcy5sb2FkaW5nO1xuICAgIH1cblxuICAgIG9uQ29tcG9zaXRpb25TdGFydCgpIHtcbiAgICAgICAgdGhpcy5faXNDb21wb3NpbmcgPSB0cnVlO1xuICAgIH1cblxuICAgIG9uQ29tcG9zaXRpb25FbmQodGVybTogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzQ29tcG9zaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnNlYXJjaFdoaWxlQ29tcG9zaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZpbHRlcih0ZXJtKTtcbiAgICB9XG5cbiAgICBmaWx0ZXIodGVybTogc3RyaW5nLCBwYXJhbXM/KSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0NvbXBvc2luZyAmJiAhdGhpcy5zZWFyY2hXaGlsZUNvbXBvc2luZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZWFyY2hUZXJtID0gdGVybTtcbiAgICAgICAgaWYgKHRoaXMuX2lzVHlwZWFoZWFkICYmICh0aGlzLl92YWxpZFRlcm0gfHwgdGhpcy5taW5UZXJtTGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgdGhpcy50eXBlYWhlYWQubmV4dCh0ZXJtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5faXNUeXBlYWhlYWQpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LmZpbHRlcih0aGlzLnNlYXJjaFRlcm0sIHBhcmFtcyk7XG4gICAgICAgICAgICBpZiAodGhpcy5pc09wZW4gJiYgdGhpcy5tYXJrRmlyc3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5tYXJrU2VsZWN0ZWRPckRlZmF1bHQodGhpcy5tYXJrRmlyc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnVzZVNlYXJjaEluUGFuZWwpIHtcbiAgICAgICAgICAgIHRoaXMuc2VhcmNoRXZlbnQuZW1pdCh7dGVybSwgaXRlbXM6IHRoaXMuaXRlbXNMaXN0LmZpbHRlcmVkSXRlbXMubWFwKHggPT4geC52YWx1ZSl9KTtcbiAgICAgICAgICAgIHRoaXMub3BlbigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25JbnB1dEZvY3VzKCRldmVudCkge1xuICAgICAgICBpZiAodGhpcy5mb2N1c2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fZWRpdGFibGVTZWFyY2hUZXJtKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRTZWFyY2hUZXJtRnJvbUl0ZW1zKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnbmctc2VsZWN0LWZvY3VzZWQnKTtcbiAgICAgICAgdGhpcy5mb2N1c0V2ZW50LmVtaXQoJGV2ZW50KTtcbiAgICAgICAgdGhpcy5mb2N1c2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBvbklucHV0Qmx1cigkZXZlbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ25nLXNlbGVjdC1mb2N1c2VkJyk7XG4gICAgICAgIHRoaXMuYmx1ckV2ZW50LmVtaXQoJGV2ZW50KTtcbiAgICAgICAgaWYgKCF0aGlzLmlzT3BlbiAmJiAhdGhpcy5kaXNhYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5fb25Ub3VjaGVkKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2VkaXRhYmxlU2VhcmNoVGVybSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0U2VhcmNoVGVybUZyb21JdGVtcygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9jdXNlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIG9uSXRlbUhvdmVyKGl0ZW06IE5nT3B0aW9uKSB7XG4gICAgICAgIGlmIChpdGVtLmRpc2FibGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pdGVtc0xpc3QubWFya0l0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgZGV0ZWN0Q2hhbmdlcygpIHtcbiAgICAgICAgaWYgKCEodGhpcy5fY2QgYXMgYW55KS5kZXN0cm95ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2NkLmRldGVjdENoYW5nZXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3NldFNlYXJjaFRlcm1Gcm9tSXRlbXMoKSB7XG4gICAgICAgIC8vIGRpc2FibGUgZm9yIG5vd1xuXG4gICAgICAgIC8vIGNvbnN0IHNlbGVjdGVkID0gdGhpcy5zZWxlY3RlZEl0ZW1zICYmIHRoaXMuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgLy8gdGhpcy5zZWFyY2hUZXJtID0gKHNlbGVjdGVkICYmIHNlbGVjdGVkLmxhYmVsKSB8fCBudWxsO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3NldEl0ZW1zKGl0ZW1zOiBhbnlbXSkge1xuICAgICAgICBjb25zdCBmaXJzdEl0ZW0gPSBpdGVtc1swXTtcbiAgICAgICAgdGhpcy5iaW5kTGFiZWwgPSB0aGlzLmJpbmRMYWJlbCB8fCB0aGlzLl9kZWZhdWx0TGFiZWw7XG4gICAgICAgIHRoaXMuX3ByaW1pdGl2ZSA9IGlzRGVmaW5lZChmaXJzdEl0ZW0pID8gIWlzT2JqZWN0KGZpcnN0SXRlbSkgOiB0aGlzLl9wcmltaXRpdmUgfHwgdGhpcy5iaW5kTGFiZWwgPT09IHRoaXMuX2RlZmF1bHRMYWJlbDtcbiAgICAgICAgdGhpcy5pdGVtc0xpc3Quc2V0SXRlbXMoaXRlbXMpO1xuICAgICAgICBpZiAoaXRlbXMubGVuZ3RoID4gMCAmJiB0aGlzLmhhc1ZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5tYXBTZWxlY3RlZEl0ZW1zKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNPcGVuICYmIGlzRGVmaW5lZCh0aGlzLnNlYXJjaFRlcm0pICYmICF0aGlzLl9pc1R5cGVhaGVhZCkge1xuICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3QuZmlsdGVyKHRoaXMuc2VhcmNoVGVybSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2lzVHlwZWFoZWFkIHx8IHRoaXMuaXNPcGVuKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5tYXJrU2VsZWN0ZWRPckRlZmF1bHQodGhpcy5tYXJrRmlyc3QpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0SXRlbXNGcm9tTmdPcHRpb25zKCkge1xuICAgICAgICBjb25zdCBtYXBOZ09wdGlvbnMgPSAob3B0aW9uczogUXVlcnlMaXN0PE5nT3B0aW9uQ29tcG9uZW50PikgPT4ge1xuICAgICAgICAgICAgdGhpcy5pdGVtcyA9IG9wdGlvbnMubWFwKG9wdGlvbiA9PiAoe1xuICAgICAgICAgICAgICAgICRuZ09wdGlvblZhbHVlOiBvcHRpb24udmFsdWUsXG4gICAgICAgICAgICAgICAgJG5nT3B0aW9uTGFiZWw6IG9wdGlvbi5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQuaW5uZXJIVE1MLFxuICAgICAgICAgICAgICAgIGRpc2FibGVkOiBvcHRpb24uZGlzYWJsZWRcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LnNldEl0ZW1zKHRoaXMuaXRlbXMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5tYXBTZWxlY3RlZEl0ZW1zKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRldGVjdENoYW5nZXMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBoYW5kbGVPcHRpb25DaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkT3JEZXN0cm95ZWQgPSBtZXJnZSh0aGlzLm5nT3B0aW9ucy5jaGFuZ2VzLCB0aGlzLl9kZXN0cm95JCk7XG4gICAgICAgICAgICBtZXJnZSguLi50aGlzLm5nT3B0aW9ucy5tYXAob3B0aW9uID0+IG9wdGlvbi5zdGF0ZUNoYW5nZSQpKVxuICAgICAgICAgICAgICAgIC5waXBlKHRha2VVbnRpbChjaGFuZ2VkT3JEZXN0cm95ZWQpKVxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUob3B0aW9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNMaXN0LmZpbmRJdGVtKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uZGlzYWJsZWQgPSBvcHRpb24uZGlzYWJsZWQ7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ubGFiZWwgPSBvcHRpb24ubGFiZWwgfHwgaXRlbS5sYWJlbDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2QuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubmdPcHRpb25zLmNoYW5nZXNcbiAgICAgICAgICAgIC5waXBlKHN0YXJ0V2l0aCh0aGlzLm5nT3B0aW9ucyksIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95JCkpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKG9wdGlvbnMgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuYmluZExhYmVsID0gdGhpcy5fZGVmYXVsdExhYmVsO1xuICAgICAgICAgICAgICAgIG1hcE5nT3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVPcHRpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2lzVmFsaWRXcml0ZVZhbHVlKHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFpc0RlZmluZWQodmFsdWUpIHx8ICh0aGlzLm11bHRpcGxlICYmIHZhbHVlID09PSAnJykgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2YWxpZGF0ZUJpbmRpbmcgPSAoaXRlbTogYW55KTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBpZiAoIWlzRGVmaW5lZCh0aGlzLmNvbXBhcmVXaXRoKSAmJiBpc09iamVjdChpdGVtKSAmJiB0aGlzLmJpbmRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICAgICAgYFNldHRpbmcgb2JqZWN0KCR7SlNPTi5zdHJpbmdpZnkoaXRlbSl9KSBhcyB5b3VyIG1vZGVsIHdpdGggYmluZFZhbHVlIGlzIG5vdCBhbGxvd2VkIHVubGVzcyBbY29tcGFyZVdpdGhdIGlzIHVzZWQuYFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb25zb2xlLndhcm4oJ011bHRpcGxlIHNlbGVjdCBuZ01vZGVsIHNob3VsZCBiZSBhcnJheS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUuZXZlcnkoaXRlbSA9PiB2YWxpZGF0ZUJpbmRpbmcoaXRlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHZhbGlkYXRlQmluZGluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVXcml0ZVZhbHVlKG5nTW9kZWw6IGFueSB8IGFueVtdKSB7XG4gICAgICAgIGlmICghdGhpcy5faXNWYWxpZFdyaXRlVmFsdWUobmdNb2RlbCkpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2VsZWN0ID0gKHZhbDogYW55KSA9PiB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IHRoaXMuaXRlbXNMaXN0LmZpbmRJdGVtKHZhbCk7XG4gICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LnNlbGVjdChpdGVtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNWYWxPYmplY3QgPSBpc09iamVjdCh2YWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUHJpbWl0aXZlID0gIWlzVmFsT2JqZWN0ICYmICF0aGlzLmJpbmRWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoKGlzVmFsT2JqZWN0IHx8IGlzUHJpbWl0aXZlKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5zZWxlY3QodGhpcy5pdGVtc0xpc3QubWFwSXRlbSh2YWwsIG51bGwpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuYmluZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBbdGhpcy5iaW5kTGFiZWxdOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgW3RoaXMuYmluZFZhbHVlXTogdmFsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LnNlbGVjdCh0aGlzLml0ZW1zTGlzdC5tYXBJdGVtKGl0ZW0sIG51bGwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIChuZ01vZGVsIGFzIGFueVtdKS5mb3JFYWNoKGl0ZW0gPT4gc2VsZWN0KGl0ZW0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdChuZ01vZGVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUtleVByZXNzZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNlYXJjaGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2tleVByZXNzJFxuICAgICAgICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3kkKSxcbiAgICAgICAgICAgICAgICB0YXAobGV0dGVyID0+IHRoaXMuX3ByZXNzZWRLZXlzLnB1c2gobGV0dGVyKSksXG4gICAgICAgICAgICAgICAgZGVib3VuY2VUaW1lKDIwMCksXG4gICAgICAgICAgICAgICAgZmlsdGVyKCgpID0+IHRoaXMuX3ByZXNzZWRLZXlzLmxlbmd0aCA+IDApLFxuICAgICAgICAgICAgICAgIG1hcCgoKSA9PiB0aGlzLl9wcmVzc2VkS2V5cy5qb2luKCcnKSkpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKHRlcm0gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zTGlzdC5maW5kQnlMYWJlbCh0ZXJtKTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc09wZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcmtJdGVtKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsVG9NYXJrZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NkLm1hcmtGb3JDaGVjaygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJlc3NlZEtleXMgPSBbXTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3NldElucHV0QXR0cmlidXRlcygpIHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB0aGlzLnVzZVNlYXJjaEluUGFuZWwgPyB0aGlzLmhlYWRlclNlYXJjaElucHV0IDogdGhpcy5zZWFyY2hJbnB1dDtcblxuICAgICAgICBpZiAoIWlucHV0KSB7XG4gICAgICAgICAgICAvLyB0cnkgYWdhaW4gbGF0ZXJcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSB7XG4gICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICBhdXRvY29ycmVjdDogJ29mZicsXG4gICAgICAgICAgICBhdXRvY2FwaXRhbGl6ZTogJ29mZicsXG4gICAgICAgICAgICBhdXRvY29tcGxldGU6IHRoaXMubGFiZWxGb3JJZCA/ICdvZmYnIDogdGhpcy5kcm9wZG93bklkLFxuICAgICAgICAgICAgLi4udGhpcy5pbnB1dEF0dHJzXG4gICAgICAgIH07XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgIGlucHV0Lm5hdGl2ZUVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgYXR0cmlidXRlc1trZXldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3VwZGF0ZU5nTW9kZWwoKSB7XG4gICAgICAgIGNvbnN0IG1vZGVsID0gW107XG4gICAgICAgIGZvcihjb25zdCBpdGVtIG9mIHRoaXMuc2VsZWN0ZWRJdGVtcykge1xuICAgICAgICAgICAgaWYgKHRoaXMuYmluZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBncm91cEtleSA9IHRoaXMuZ3JvdXBWYWx1ZSA/IHRoaXMuYmluZFZhbHVlIDogdGhpcy5ncm91cEJ5IGFzIHN0cmluZztcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpdGVtLnZhbHVlW2dyb3VwS2V5IHx8IHRoaXMuZ3JvdXBCeSBhcyBzdHJpbmddO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5pdGVtc0xpc3QucmVzb2x2ZU5lc3RlZChpdGVtLnZhbHVlLCB0aGlzLmJpbmRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGVsLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb2RlbC5wdXNoKGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkSXRlbXMubWFwKHggPT4geC52YWx1ZSk7XG4gICAgICAgIGlmICh0aGlzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkNoYW5nZShtb2RlbCk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUV2ZW50LmVtaXQoc2VsZWN0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fb25DaGFuZ2UoaXNEZWZpbmVkKG1vZGVsWzBdKSA/IG1vZGVsWzBdIDogbnVsbCk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUV2ZW50LmVtaXQoc2VsZWN0ZWRbMF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fY2QubWFya0ZvckNoZWNrKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY2xlYXJTZWFyY2goKSB7XG4gICAgICAgIGlmICghdGhpcy5zZWFyY2hUZXJtKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jaGFuZ2VTZWFyY2gobnVsbCk7XG4gICAgICAgIHRoaXMuaXRlbXNMaXN0LnJlc2V0RmlsdGVyZWRJdGVtcygpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NoYW5nZVNlYXJjaChzZWFyY2hUZXJtOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5zZWFyY2hUZXJtID0gc2VhcmNoVGVybTtcbiAgICAgICAgaWYgKHRoaXMuX2lzVHlwZWFoZWFkKSB7XG4gICAgICAgICAgICB0aGlzLnR5cGVhaGVhZC5uZXh0KHNlYXJjaFRlcm0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2Nyb2xsVG9NYXJrZWQoKSB7XG4gICAgICAgIGlmICghdGhpcy5pc09wZW4gfHwgIXRoaXMuZHJvcGRvd25QYW5lbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZHJvcGRvd25QYW5lbC5zY3JvbGxUbyh0aGlzLml0ZW1zTGlzdC5tYXJrZWRJdGVtKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9zY3JvbGxUb1RhZygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT3BlbiB8fCAhdGhpcy5kcm9wZG93blBhbmVsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kcm9wZG93blBhbmVsLnNjcm9sbFRvVGFnKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfb25TZWxlY3Rpb25DaGFuZ2VkKCkge1xuICAgICAgICBpZiAodGhpcy5pc09wZW4gJiYgdGhpcy5tdWx0aXBsZSAmJiB0aGlzLmFwcGVuZFRvKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgaXRlbXMgYXJlIHJlbmRlcmVkLlxuICAgICAgICAgICAgdGhpcy5fY2QuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgICAgICAgdGhpcy5kcm9wZG93blBhbmVsLmFkanVzdFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVUYWIoJGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmlzT3BlbiA9PT0gZmFsc2UgJiYgIXRoaXMuYWRkVGFnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zZWxlY3RPblRhYikge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXNMaXN0Lm1hcmtlZEl0ZW0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZUl0ZW0odGhpcy5pdGVtc0xpc3QubWFya2VkSXRlbSk7XG4gICAgICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc2hvd0FkZFRhZykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0VGFnKCk7XG4gICAgICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUVudGVyKCRldmVudDogS2V5Ym9hcmRFdmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc09wZW4gfHwgdGhpcy5fbWFudWFsT3Blbikge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXNMaXN0Lm1hcmtlZEl0ZW0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZUl0ZW0odGhpcy5pdGVtc0xpc3QubWFya2VkSXRlbSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc2hvd0FkZFRhZykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0VGFnKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcGVuT25FbnRlcikge1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVTcGFjZSgkZXZlbnQ6IEtleWJvYXJkRXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNPcGVuIHx8IHRoaXMuX21hbnVhbE9wZW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlQXJyb3dEb3duKCRldmVudDogS2V5Ym9hcmRFdmVudCkge1xuICAgICAgICBpZiAodGhpcy5fbmV4dEl0ZW1Jc1RhZygrMSkpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LnVubWFya0l0ZW0oKTtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbFRvVGFnKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5tYXJrTmV4dEl0ZW0oKTtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbFRvTWFya2VkKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZUFycm93VXAoJGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5pc09wZW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9uZXh0SXRlbUlzVGFnKC0xKSkge1xuICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3QudW5tYXJrSXRlbSgpO1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsVG9UYWcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcmtQcmV2aW91c0l0ZW0oKTtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbFRvTWFya2VkKCk7XG4gICAgICAgIH1cbiAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbmV4dEl0ZW1Jc1RhZyhuZXh0U3RlcDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IG5leHRJbmRleCA9IHRoaXMuaXRlbXNMaXN0Lm1hcmtlZEluZGV4ICsgbmV4dFN0ZXA7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFRhZyAmJiB0aGlzLnNlYXJjaFRlcm1cbiAgICAgICAgICAgICYmIHRoaXMuaXRlbXNMaXN0Lm1hcmtlZEl0ZW1cbiAgICAgICAgICAgICYmIChuZXh0SW5kZXggPCAwIHx8IG5leHRJbmRleCA9PT0gdGhpcy5pdGVtc0xpc3QuZmlsdGVyZWRJdGVtcy5sZW5ndGgpXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlQmFja3NwYWNlKCkge1xuICAgICAgICBpZiAodGhpcy5zZWFyY2hUZXJtIHx8ICF0aGlzLmNsZWFyYWJsZSB8fCAhdGhpcy5jbGVhck9uQmFja3NwYWNlIHx8ICF0aGlzLmhhc1ZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgdGhpcy51bnNlbGVjdCh0aGlzLml0ZW1zTGlzdC5sYXN0U2VsZWN0ZWRJdGVtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJNb2RlbCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXQgX2lzVHlwZWFoZWFkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlYWhlYWQgJiYgdGhpcy50eXBlYWhlYWQub2JzZXJ2ZXJzLmxlbmd0aCA+IDA7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXQgX3ZhbGlkVGVybSgpIHtcbiAgICAgICAgY29uc3QgdGVybSA9IHRoaXMuc2VhcmNoVGVybSAmJiB0aGlzLnNlYXJjaFRlcm0udHJpbSgpO1xuICAgICAgICByZXR1cm4gdGVybSAmJiB0ZXJtLmxlbmd0aCA+PSB0aGlzLm1pblRlcm1MZW5ndGg7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbWVyZ2VHbG9iYWxDb25maWcoY29uZmlnOiBOZ1NlbGVjdENvbmZpZykge1xuICAgICAgICB0aGlzLnBsYWNlaG9sZGVyID0gdGhpcy5wbGFjZWhvbGRlciB8fCBjb25maWcucGxhY2Vob2xkZXI7XG4gICAgICAgIHRoaXMubm90Rm91bmRUZXh0ID0gdGhpcy5ub3RGb3VuZFRleHQgfHwgY29uZmlnLm5vdEZvdW5kVGV4dDtcbiAgICAgICAgdGhpcy50eXBlVG9TZWFyY2hUZXh0ID0gdGhpcy50eXBlVG9TZWFyY2hUZXh0IHx8IGNvbmZpZy50eXBlVG9TZWFyY2hUZXh0O1xuICAgICAgICB0aGlzLmFkZFRhZ1RleHQgPSB0aGlzLmFkZFRhZ1RleHQgfHwgY29uZmlnLmFkZFRhZ1RleHQ7XG4gICAgICAgIHRoaXMubG9hZGluZ1RleHQgPSB0aGlzLmxvYWRpbmdUZXh0IHx8IGNvbmZpZy5sb2FkaW5nVGV4dDtcbiAgICAgICAgdGhpcy5jbGVhckFsbFRleHQgPSB0aGlzLmNsZWFyQWxsVGV4dCB8fCBjb25maWcuY2xlYXJBbGxUZXh0O1xuICAgICAgICB0aGlzLnZpcnR1YWxTY3JvbGwgPSBpc0RlZmluZWQodGhpcy52aXJ0dWFsU2Nyb2xsKVxuICAgICAgICAgICAgPyB0aGlzLnZpcnR1YWxTY3JvbGxcbiAgICAgICAgICAgIDogaXNEZWZpbmVkKGNvbmZpZy5kaXNhYmxlVmlydHVhbFNjcm9sbCkgPyAhY29uZmlnLmRpc2FibGVWaXJ0dWFsU2Nyb2xsIDogZmFsc2U7XG4gICAgICAgIHRoaXMub3Blbk9uRW50ZXIgPSBpc0RlZmluZWQodGhpcy5vcGVuT25FbnRlcikgPyB0aGlzLm9wZW5PbkVudGVyIDogY29uZmlnLm9wZW5PbkVudGVyO1xuICAgICAgICB0aGlzLmFwcGVuZFRvID0gdGhpcy5hcHBlbmRUbyB8fCBjb25maWcuYXBwZW5kVG87XG4gICAgICAgIHRoaXMuYmluZFZhbHVlID0gdGhpcy5iaW5kVmFsdWUgfHwgY29uZmlnLmJpbmRWYWx1ZTtcbiAgICAgICAgdGhpcy5iaW5kTGFiZWwgPSB0aGlzLmJpbmRMYWJlbCB8fCBjb25maWcuYmluZExhYmVsO1xuICAgICAgICB0aGlzLmFwcGVhcmFuY2UgPSB0aGlzLmFwcGVhcmFuY2UgfHwgY29uZmlnLmFwcGVhcmFuY2U7XG4gICAgfVxufVxuIiwiPGRpdlxuICAgIChtb3VzZWRvd24pPVwiaGFuZGxlTW91c2Vkb3duKCRldmVudClcIlxuICAgIFtjbGFzcy5uZy1hcHBlYXJhbmNlLW91dGxpbmVdPVwiYXBwZWFyYW5jZSA9PT0gJ291dGxpbmUnXCJcbiAgICBbY2xhc3MubmctaGFzLXZhbHVlXT1cImhhc1ZhbHVlXCJcbiAgICBbbmdDbGFzc109XCJ7J25nLXVzZS1zZWFyY2gtaW5wdXQnOiAhdXNlU2VhcmNoSW5QYW5lbH1cIlxuICAgIGNsYXNzPVwibmctc2VsZWN0LWNvbnRhaW5lclwiPlxuXG4gICAgPGRpdiBjbGFzcz1cIm5nLXZhbHVlLWNvbnRhaW5lclwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmctcGxhY2Vob2xkZXJcIj57e3BsYWNlaG9sZGVyfX08L2Rpdj5cblxuICAgICAgICA8bmctY29udGFpbmVyICpuZ0lmPVwiKCFtdWx0aUxhYmVsVGVtcGxhdGUgIHx8ICFtdWx0aXBsZSApICYmIHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMFwiPlxuICAgICAgICAgICAgPGRpdiBbY2xhc3MubmctdmFsdWUtZGlzYWJsZWRdPVwiaXRlbS5kaXNhYmxlZFwiIGNsYXNzPVwibmctdmFsdWVcIiAqbmdGb3I9XCJsZXQgaXRlbSBvZiBzZWxlY3RlZEl0ZW1zOyB0cmFja0J5OiB0cmFja0J5T3B0aW9uXCI+XG4gICAgICAgICAgICAgICAgPG5nLXRlbXBsYXRlICNkZWZhdWx0TGFiZWxUZW1wbGF0ZT5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJuZy12YWx1ZS1pY29uIGxlZnRcIiAoY2xpY2spPVwidW5zZWxlY3QoaXRlbSk7XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+w5c8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibmctdmFsdWUtbGFiZWxcIiBbbmdJdGVtTGFiZWxdPVwiaXRlbS5sYWJlbFwiIFtlc2NhcGVdPVwiZXNjYXBlSFRNTFwiPjwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgICAgICAgICAgICAgPG5nLXRlbXBsYXRlXG4gICAgICAgICAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cImxhYmVsVGVtcGxhdGUgfHwgZGVmYXVsdExhYmVsVGVtcGxhdGVcIlxuICAgICAgICAgICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyBpdGVtOiBpdGVtLnZhbHVlLCBjbGVhcjogY2xlYXJJdGVtLCBsYWJlbDogaXRlbS5sYWJlbCB9XCI+XG4gICAgICAgICAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L25nLWNvbnRhaW5lcj5cblxuICAgICAgICA8bmctdGVtcGxhdGUgKm5nSWY9XCJtdWx0aXBsZSAmJiBtdWx0aUxhYmVsVGVtcGxhdGUgJiYgc2VsZWN0ZWRWYWx1ZXMubGVuZ3RoID4gMFwiXG4gICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwibXVsdGlMYWJlbFRlbXBsYXRlXCJcbiAgICAgICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyBpdGVtczogc2VsZWN0ZWRWYWx1ZXMsIGNsZWFyOiBjbGVhckl0ZW0gfVwiPlxuICAgICAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuZy1pbnB1dFwiXG4gICAgICAgICAgICByb2xlPVwiY29tYm9ib3hcIlxuICAgICAgICAgICAgW2F0dHIuYXJpYS1leHBhbmRlZF09XCJpc09wZW5cIlxuICAgICAgICAgICAgW2F0dHIuYXJpYS1vd25zXT1cImlzT3BlbiA/IGRyb3Bkb3duSWQgOiBudWxsXCJcbiAgICAgICAgICAgIGFyaWEtaGFzcG9wdXA9XCJsaXN0Ym94XCI+XG5cbiAgICAgICAgICAgIDxpbnB1dCAjc2VhcmNoSW5wdXRcbiAgICAgICAgICAgICAgICAgICBbYXR0ci5pZF09XCJsYWJlbEZvcklkXCJcbiAgICAgICAgICAgICAgICAgICBbYXR0ci50YWJpbmRleF09XCJ0YWJJbmRleFwiXG4gICAgICAgICAgICAgICAgICAgW3JlYWRPbmx5XT1cIiFzZWFyY2hhYmxlIHx8IGl0ZW1zTGlzdC5tYXhJdGVtc1NlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiZGlzYWJsZWRcIlxuICAgICAgICAgICAgICAgICAgIFt2YWx1ZV09XCJzZWFyY2hUZXJtID8gc2VhcmNoVGVybSA6ICcnXCJcbiAgICAgICAgICAgICAgICAgICAoaW5wdXQpPVwiZmlsdGVyKHNlYXJjaElucHV0LnZhbHVlKVwiXG4gICAgICAgICAgICAgICAgICAgKGNvbXBvc2l0aW9uc3RhcnQpPVwib25Db21wb3NpdGlvblN0YXJ0KClcIlxuICAgICAgICAgICAgICAgICAgIChjb21wb3NpdGlvbmVuZCk9XCJvbkNvbXBvc2l0aW9uRW5kKHNlYXJjaElucHV0LnZhbHVlKVwiXG4gICAgICAgICAgICAgICAgICAgKGZvY3VzKT1cIm9uSW5wdXRGb2N1cygkZXZlbnQpXCJcbiAgICAgICAgICAgICAgICAgICAoYmx1cik9XCJvbklucHV0Qmx1cigkZXZlbnQpXCJcbiAgICAgICAgICAgICAgICAgICAoY2hhbmdlKT1cIiRldmVudC5zdG9wUHJvcGFnYXRpb24oKVwiXG4gICAgICAgICAgICAgICAgICAgW2F0dHIuYXJpYS1hY3RpdmVkZXNjZW5kYW50XT1cImlzT3BlbiA/IGl0ZW1zTGlzdD8ubWFya2VkSXRlbT8uaHRtbElkIDogbnVsbFwiXG4gICAgICAgICAgICAgICAgICAgYXJpYS1hdXRvY29tcGxldGU9XCJsaXN0XCJcbiAgICAgICAgICAgICAgICAgICBbYXR0ci5hcmlhLWNvbnRyb2xzXT1cImlzT3BlbiA/IGRyb3Bkb3duSWQgOiBudWxsXCI+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuXG4gICAgPG5nLWNvbnRhaW5lciAqbmdJZj1cImxvYWRpbmdcIj5cbiAgICAgICAgPG5nLXRlbXBsYXRlICNkZWZhdWx0TG9hZGluZ1NwaW5uZXJUZW1wbGF0ZT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuZy1zcGlubmVyLWxvYWRlclwiPjwvZGl2PlxuICAgICAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgICAgIDxuZy10ZW1wbGF0ZVxuICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwibG9hZGluZ1NwaW5uZXJUZW1wbGF0ZSB8fCBkZWZhdWx0TG9hZGluZ1NwaW5uZXJUZW1wbGF0ZVwiPlxuICAgICAgICA8L25nLXRlbXBsYXRlPlxuICAgIDwvbmctY29udGFpbmVyPlxuXG4gICAgPHNwYW4gKm5nSWY9XCJzaG93Q2xlYXIoKVwiIGNsYXNzPVwibmctY2xlYXItd3JhcHBlclwiIHRpdGxlPVwie3tjbGVhckFsbFRleHR9fVwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cIm5nLWNsZWFyXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+w5c8L3NwYW4+XG4gICAgPC9zcGFuPlxuXG4gICAgPHNwYW4gY2xhc3M9XCJuZy1hcnJvdy13cmFwcGVyXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibmctYXJyb3dcIj48L3NwYW4+XG4gICAgPC9zcGFuPlxuPC9kaXY+XG5cbjxuZy1kcm9wZG93bi1wYW5lbCAqbmdJZj1cImlzT3BlblwiXG4gICAgICAgICAgICAgICAgICAgY2xhc3M9XCJuZy1kcm9wZG93bi1wYW5lbFwiXG4gICAgICAgICAgICAgICAgICAgW3ZpcnR1YWxTY3JvbGxdPVwidmlydHVhbFNjcm9sbFwiXG4gICAgICAgICAgICAgICAgICAgW2J1ZmZlckFtb3VudF09XCJidWZmZXJBbW91bnRcIlxuICAgICAgICAgICAgICAgICAgIFthcHBlbmRUb109XCJhcHBlbmRUb1wiXG4gICAgICAgICAgICAgICAgICAgW3Bvc2l0aW9uXT1cImRyb3Bkb3duUG9zaXRpb25cIlxuICAgICAgICAgICAgICAgICAgIFtoZWFkZXJTZWFyY2hUZW1wbGF0ZV09XCJ1c2VTZWFyY2hJblBhbmVsID8gaGVhZGVyU2VhcmNoVGVtcGxhdGUgOiBudWxsXCJcbiAgICAgICAgICAgICAgICAgICBbaGVhZGVyVGVtcGxhdGVdPVwiaGVhZGVyVGVtcGxhdGVcIlxuICAgICAgICAgICAgICAgICAgIFtmb290ZXJUZW1wbGF0ZV09XCJmb290ZXJUZW1wbGF0ZVwiXG4gICAgICAgICAgICAgICAgICAgW2ZpbHRlclZhbHVlXT1cInNlYXJjaFRlcm1cIlxuICAgICAgICAgICAgICAgICAgIFtpdGVtc109XCJpdGVtc0xpc3QuZmlsdGVyZWRJdGVtc1wiXG4gICAgICAgICAgICAgICAgICAgW21hcmtlZEl0ZW1dPVwiaXRlbXNMaXN0Lm1hcmtlZEl0ZW1cIlxuICAgICAgICAgICAgICAgICAgICh1cGRhdGUpPVwidmlld1BvcnRJdGVtcyA9ICRldmVudFwiXG4gICAgICAgICAgICAgICAgICAgKHNjcm9sbCk9XCJzY3JvbGwuZW1pdCgkZXZlbnQpXCJcbiAgICAgICAgICAgICAgICAgICAoc2Nyb2xsVG9FbmQpPVwic2Nyb2xsVG9FbmQuZW1pdCgkZXZlbnQpXCJcbiAgICAgICAgICAgICAgICAgICAob3V0c2lkZUNsaWNrKT1cImNsb3NlKClcIlxuICAgICAgICAgICAgICAgICAgIFtjbGFzcy5uZy1zZWxlY3QtbXVsdGlwbGVdPVwibXVsdGlwbGVcIlxuICAgICAgICAgICAgICAgICAgIFtuZ0NsYXNzXT1cImFwcGVuZFRvID8gY2xhc3NlcyA6IG51bGxcIlxuICAgICAgICAgICAgICAgICAgIFtpZF09XCJkcm9wZG93bklkXCJcbiAgICAgICAgICAgICAgICAgICByb2xlPVwibGlzdGJveFwiXG4gICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD1cIk9wdGlvbnMgbGlzdFwiPlxuXG4gICAgPG5nLXRlbXBsYXRlICNoZWFkZXJTZWFyY2hUZW1wbGF0ZT5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5nLXNlbGVjdC1kcm9wZG93bi1zZWFyY2ggbS1uXCI+XG4gICAgICAgICAgICA8aW5wdXQgI2hlYWRlclNlYXJjaElucHV0XG4gICAgICAgICAgICAgICAgICAgY2xhc3M9XCJmb3JtLWNvbnRyb2wgc2VhcmNoLWlucHV0XCJcbiAgICAgICAgICAgICAgICAgICBbYXR0ci5pZF09XCJsYWJlbEZvcklkXCJcbiAgICAgICAgICAgICAgICAgICBbYXR0ci50YWJpbmRleF09XCJ0YWJJbmRleFwiXG4gICAgICAgICAgICAgICAgICAgW3JlYWRPbmx5XT1cIiFzZWFyY2hhYmxlIHx8IGl0ZW1zTGlzdC5tYXhJdGVtc1NlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiZGlzYWJsZWRcIlxuICAgICAgICAgICAgICAgICAgIFt2YWx1ZV09XCJzZWFyY2hUZXJtID8gc2VhcmNoVGVybSA6ICcnXCJcbiAgICAgICAgICAgICAgICAgICAoaW5wdXQpPVwiZmlsdGVyKGhlYWRlclNlYXJjaElucHV0LnZhbHVlKVwiXG4gICAgICAgICAgICAgICAgICAgKGNvbXBvc2l0aW9uc3RhcnQpPVwib25Db21wb3NpdGlvblN0YXJ0KClcIlxuICAgICAgICAgICAgICAgICAgIChjb21wb3NpdGlvbmVuZCk9XCJvbkNvbXBvc2l0aW9uRW5kKGhlYWRlclNlYXJjaElucHV0LnZhbHVlKVwiXG4gICAgICAgICAgICAgICAgICAgKGZvY3VzKT1cIm9uSW5wdXRGb2N1cygkZXZlbnQpXCJcbiAgICAgICAgICAgICAgICAgICAoYmx1cik9XCJvbklucHV0Qmx1cigkZXZlbnQpXCJcbiAgICAgICAgICAgICAgICAgICAoY2hhbmdlKT1cIiRldmVudC5zdG9wUHJvcGFnYXRpb24oKVwiXG4gICAgICAgICAgICAgICAgICAgW2F0dHIuYXJpYS1hY3RpdmVkZXNjZW5kYW50XT1cImlzT3BlbiA/IGl0ZW1zTGlzdD8ubWFya2VkSXRlbT8uaHRtbElkIDogbnVsbFwiXG4gICAgICAgICAgICAgICAgICAgYXJpYS1hdXRvY29tcGxldGU9XCJsaXN0XCJcbiAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIlNlYXJjaFwiXG4gICAgICAgICAgICAgICAgICAgW2F0dHIuYXJpYS1jb250cm9sc109XCJpc09wZW4gPyBkcm9wZG93bklkIDogbnVsbFwiPlxuICAgICAgICA8L2Rpdj5cbiAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgPG5nLWNvbnRhaW5lcj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5nLW9wdGlvblwiIFthdHRyLnJvbGVdPVwiaXRlbS5jaGlsZHJlbiA/ICdncm91cCcgOiAnb3B0aW9uJ1wiIChjbGljayk9XCJ0b2dnbGVJdGVtKGl0ZW0pXCIgKG1vdXNlb3Zlcik9XCJvbkl0ZW1Ib3ZlcihpdGVtKVwiXG4gICAgICAgICAgICAgICAgKm5nRm9yPVwibGV0IGl0ZW0gb2Ygdmlld1BvcnRJdGVtczsgdHJhY2tCeTogdHJhY2tCeU9wdGlvblwiXG4gICAgICAgICAgICAgICAgW2NsYXNzLm5nLW9wdGlvbi1kaXNhYmxlZF09XCJpdGVtLmRpc2FibGVkXCJcbiAgICAgICAgICAgICAgICBbY2xhc3Mubmctb3B0aW9uLXNlbGVjdGVkXT1cIml0ZW0uc2VsZWN0ZWRcIlxuICAgICAgICAgICAgICAgIFtjbGFzcy5uZy1vcHRncm91cF09XCJpdGVtLmNoaWxkcmVuXCJcbiAgICAgICAgICAgICAgICBbY2xhc3Mubmctb3B0aW9uXT1cIiFpdGVtLmNoaWxkcmVuXCJcbiAgICAgICAgICAgICAgICBbY2xhc3Mubmctb3B0aW9uLWNoaWxkXT1cIiEhaXRlbS5wYXJlbnRcIlxuICAgICAgICAgICAgICAgIFtjbGFzcy5uZy1vcHRpb24tbWFya2VkXT1cIml0ZW0gPT09IGl0ZW1zTGlzdC5tYXJrZWRJdGVtXCJcbiAgICAgICAgICAgICAgICBbYXR0ci5hcmlhLXNlbGVjdGVkXT1cIml0ZW0uc2VsZWN0ZWRcIlxuICAgICAgICAgICAgICAgIFthdHRyLmlkXT1cIml0ZW0/Lmh0bWxJZFwiPlxuXG4gICAgICAgICAgICA8bmctdGVtcGxhdGUgI2RlZmF1bHRPcHRpb25UZW1wbGF0ZT5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm5nLW9wdGlvbi1sYWJlbFwiIFtuZ0l0ZW1MYWJlbF09XCJpdGVtLmxhYmVsXCIgW2VzY2FwZV09XCJlc2NhcGVIVE1MXCI+PC9zcGFuPlxuICAgICAgICAgICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgICAgICAgICAgPG5nLXRlbXBsYXRlXG4gICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwiaXRlbS5jaGlsZHJlbiA/IChvcHRncm91cFRlbXBsYXRlIHx8IGRlZmF1bHRPcHRpb25UZW1wbGF0ZSkgOiAob3B0aW9uVGVtcGxhdGUgfHwgZGVmYXVsdE9wdGlvblRlbXBsYXRlKVwiXG4gICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgaXRlbTogaXRlbS52YWx1ZSwgaXRlbSQ6aXRlbSwgaW5kZXg6IGl0ZW0uaW5kZXgsIHNlYXJjaFRlcm06IHNlYXJjaFRlcm0gfVwiPlxuICAgICAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5nLW9wdGlvblwiIFtjbGFzcy5uZy1vcHRpb24tbWFya2VkXT1cIiFpdGVtc0xpc3QubWFya2VkSXRlbVwiIChtb3VzZW92ZXIpPVwiaXRlbXNMaXN0LnVubWFya0l0ZW0oKVwiIHJvbGU9XCJvcHRpb25cIiAoY2xpY2spPVwic2VsZWN0VGFnKClcIiAqbmdJZj1cInNob3dBZGRUYWdcIj5cbiAgICAgICAgICAgIDxuZy10ZW1wbGF0ZSAjZGVmYXVsdFRhZ1RlbXBsYXRlPlxuICAgICAgICAgICAgICAgIDxzcGFuPjxzcGFuIGNsYXNzPVwibmctdGFnLWxhYmVsXCI+e3thZGRUYWdUZXh0fX08L3NwYW4+XCJ7e3NlYXJjaFRlcm19fVwiPC9zcGFuPlxuICAgICAgICAgICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgICAgICAgICAgPG5nLXRlbXBsYXRlXG4gICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwidGFnVGVtcGxhdGUgfHwgZGVmYXVsdFRhZ1RlbXBsYXRlXCJcbiAgICAgICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyBzZWFyY2hUZXJtOiBzZWFyY2hUZXJtIH1cIj5cbiAgICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvbmctY29udGFpbmVyPlxuXG4gICAgPG5nLWNvbnRhaW5lciAqbmdJZj1cInNob3dOb0l0ZW1zRm91bmQoKVwiPlxuICAgICAgICA8bmctdGVtcGxhdGUgI2RlZmF1bHROb3RGb3VuZFRlbXBsYXRlPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5nLW9wdGlvbiBuZy1vcHRpb24tZGlzYWJsZWRcIj57e25vdEZvdW5kVGV4dH19PC9kaXY+XG4gICAgICAgIDwvbmctdGVtcGxhdGU+XG5cbiAgICAgICAgPG5nLXRlbXBsYXRlXG4gICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldF09XCJub3RGb3VuZFRlbXBsYXRlIHx8IGRlZmF1bHROb3RGb3VuZFRlbXBsYXRlXCJcbiAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7IHNlYXJjaFRlcm06IHNlYXJjaFRlcm0gfVwiPlxuICAgICAgICA8L25nLXRlbXBsYXRlPlxuICAgIDwvbmctY29udGFpbmVyPlxuXG4gICAgPG5nLWNvbnRhaW5lciAqbmdJZj1cInNob3dUeXBlVG9TZWFyY2goKVwiPlxuICAgICAgICA8bmctdGVtcGxhdGUgI2RlZmF1bHRUeXBlVG9TZWFyY2hUZW1wbGF0ZT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuZy1vcHRpb24gbmctb3B0aW9uLWRpc2FibGVkXCI+e3t0eXBlVG9TZWFyY2hUZXh0fX08L2Rpdj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgICAgICA8bmctdGVtcGxhdGVcbiAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cInR5cGVUb1NlYXJjaFRlbXBsYXRlIHx8IGRlZmF1bHRUeXBlVG9TZWFyY2hUZW1wbGF0ZVwiPlxuICAgICAgICA8L25nLXRlbXBsYXRlPlxuICAgIDwvbmctY29udGFpbmVyPlxuXG4gICAgPG5nLWNvbnRhaW5lciAqbmdJZj1cImxvYWRpbmcgJiYgaXRlbXNMaXN0LmZpbHRlcmVkSXRlbXMubGVuZ3RoID09PSAwXCI+XG4gICAgICAgIDxuZy10ZW1wbGF0ZSAjZGVmYXVsdExvYWRpbmdUZXh0VGVtcGxhdGU+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibmctb3B0aW9uIG5nLW9wdGlvbi1kaXNhYmxlZFwiPnt7bG9hZGluZ1RleHR9fTwvZGl2PlxuICAgICAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgICAgIDxuZy10ZW1wbGF0ZVxuICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwibG9hZGluZ1RleHRUZW1wbGF0ZSB8fCBkZWZhdWx0TG9hZGluZ1RleHRUZW1wbGF0ZVwiXG4gICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyBzZWFyY2hUZXJtOiBzZWFyY2hUZXJtIH1cIj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICA8L25nLWNvbnRhaW5lcj5cblxuPC9uZy1kcm9wZG93bi1wYW5lbD5cbiJdfQ==
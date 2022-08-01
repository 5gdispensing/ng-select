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
    get searchableNoPanel() { return this.searchable && !this.useSearchInPanel; }
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
    open(force = false) {
        if (!force && (this.disabled || this.isOpen || this._manualOpen || this.itemsList.maxItemsSelected)) {
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
        if (force) {
            // when opening was forced by the used - need to scroll to selected item
            this._scrollToMarked();
        }
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
        }, NgDropdownPanelService], queries: [{ propertyName: "optionTemplate", first: true, predicate: NgOptionTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "optgroupTemplate", first: true, predicate: NgOptgroupTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "labelTemplate", first: true, predicate: NgLabelTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "multiLabelTemplate", first: true, predicate: NgMultiLabelTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "headerTemplate", first: true, predicate: NgHeaderTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "footerTemplate", first: true, predicate: NgFooterTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "notFoundTemplate", first: true, predicate: NgNotFoundTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "typeToSearchTemplate", first: true, predicate: NgTypeToSearchTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "loadingTextTemplate", first: true, predicate: NgLoadingTextTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "tagTemplate", first: true, predicate: NgTagTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "loadingSpinnerTemplate", first: true, predicate: NgLoadingSpinnerTemplateDirective, descendants: true, read: TemplateRef }, { propertyName: "ngOptions", predicate: NgOptionComponent, descendants: true }], viewQueries: [{ propertyName: "headerSearchInput", first: true, predicate: ["headerSearchInput"], descendants: true }, { propertyName: "dropdownPanel", first: true, predicate: i0.forwardRef(function () { return NgDropdownPanelComponent; }), descendants: true }, { propertyName: "searchInput", first: true, predicate: ["searchInput"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: "<div\n    (mousedown)=\"handleMousedown($event)\"\n    [class.ng-appearance-outline]=\"appearance === 'outline'\"\n    [class.ng-has-value]=\"hasValue\"\n    [class.ng-use-search-input]=\"!useSearchInPanel\"\n    class=\"ng-select-container\">\n\n    <div class=\"ng-value-container\">\n        <div class=\"ng-placeholder\">{{placeholder}}</div>\n\n        <ng-container *ngIf=\"(!multiLabelTemplate  || !multiple ) && selectedItems.length > 0\">\n            <div [class.ng-value-disabled]=\"item.disabled\" class=\"ng-value\" *ngFor=\"let item of selectedItems; trackBy: trackByOption\">\n                <ng-template #defaultLabelTemplate>\n                    <span class=\"ng-value-icon left\" (click)=\"unselect(item);\" aria-hidden=\"true\">\u00D7</span>\n                    <span class=\"ng-value-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n                </ng-template>\n\n                <ng-template\n                    [ngTemplateOutlet]=\"labelTemplate || defaultLabelTemplate\"\n                    [ngTemplateOutletContext]=\"{ item: item.value, clear: clearItem, label: item.label }\">\n                </ng-template>\n            </div>\n        </ng-container>\n\n        <ng-template *ngIf=\"multiple && multiLabelTemplate && selectedValues.length > 0\"\n                [ngTemplateOutlet]=\"multiLabelTemplate\"\n                [ngTemplateOutletContext]=\"{ items: selectedValues, clear: clearItem }\">\n        </ng-template>\n\n        <div class=\"ng-input\"\n            role=\"combobox\"\n            [attr.aria-expanded]=\"isOpen\"\n            [attr.aria-owns]=\"isOpen ? dropdownId : null\"\n            aria-haspopup=\"listbox\">\n\n            <input #searchInput\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(searchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(searchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </div>\n\n    <ng-container *ngIf=\"loading\">\n        <ng-template #defaultLoadingSpinnerTemplate>\n            <div class=\"ng-spinner-loader\"></div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingSpinnerTemplate || defaultLoadingSpinnerTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <span *ngIf=\"showClear()\" class=\"ng-clear-wrapper\" title=\"{{clearAllText}}\">\n        <span class=\"ng-clear\" aria-hidden=\"true\">\u00D7</span>\n    </span>\n\n    <span class=\"ng-arrow-wrapper\">\n        <span class=\"ng-arrow\"></span>\n    </span>\n</div>\n\n<ng-dropdown-panel *ngIf=\"isOpen\"\n                   class=\"ng-dropdown-panel\"\n                   [virtualScroll]=\"virtualScroll\"\n                   [bufferAmount]=\"bufferAmount\"\n                   [appendTo]=\"appendTo\"\n                   [position]=\"dropdownPosition\"\n                   [headerSearchTemplate]=\"useSearchInPanel ? headerSearchTemplate : null\"\n                   [headerTemplate]=\"headerTemplate\"\n                   [footerTemplate]=\"footerTemplate\"\n                   [filterValue]=\"searchTerm\"\n                   [items]=\"itemsList.filteredItems\"\n                   [markedItem]=\"itemsList.markedItem\"\n                   (update)=\"viewPortItems = $event\"\n                   (scroll)=\"scroll.emit($event)\"\n                   (scrollToEnd)=\"scrollToEnd.emit($event)\"\n                   (outsideClick)=\"close()\"\n                   [class.ng-select-multiple]=\"multiple\"\n                   [ngClass]=\"appendTo ? classes : null\"\n                   [id]=\"dropdownId\"\n                   role=\"listbox\"\n                   aria-label=\"Options list\">\n\n    <ng-template #headerSearchTemplate>\n        <div class=\"ng-select-dropdown-search m-n\">\n            <input #headerSearchInput\n                   class=\"form-control search-input\"\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(headerSearchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(headerSearchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   placeholder=\"Search\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </ng-template>\n\n    <ng-container>\n        <div class=\"ng-option\" [attr.role]=\"item.children ? 'group' : 'option'\" (click)=\"toggleItem(item)\" (mouseover)=\"onItemHover(item)\"\n                *ngFor=\"let item of viewPortItems; trackBy: trackByOption\"\n                [class.ng-option-disabled]=\"item.disabled\"\n                [class.ng-option-selected]=\"item.selected\"\n                [class.ng-optgroup]=\"item.children\"\n                [class.ng-option]=\"!item.children\"\n                [class.ng-option-child]=\"!!item.parent\"\n                [class.ng-option-marked]=\"item === itemsList.markedItem\"\n                [attr.aria-selected]=\"item.selected\"\n                [attr.id]=\"item?.htmlId\">\n\n            <ng-template #defaultOptionTemplate>\n                <span class=\"ng-option-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"item.children ? (optgroupTemplate || defaultOptionTemplate) : (optionTemplate || defaultOptionTemplate)\"\n                [ngTemplateOutletContext]=\"{ item: item.value, item$:item, index: item.index, searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n\n        <div class=\"ng-option\" [class.ng-option-marked]=\"!itemsList.markedItem\" (mouseover)=\"itemsList.unmarkItem()\" role=\"option\" (click)=\"selectTag()\" *ngIf=\"showAddTag\">\n            <ng-template #defaultTagTemplate>\n                <span><span class=\"ng-tag-label\">{{addTagText}}</span>\"{{searchTerm}}\"</span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"tagTemplate || defaultTagTemplate\"\n                [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n    </ng-container>\n\n    <ng-container *ngIf=\"showNoItemsFound()\">\n        <ng-template #defaultNotFoundTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{notFoundText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"notFoundTemplate || defaultNotFoundTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"showTypeToSearch()\">\n        <ng-template #defaultTypeToSearchTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{typeToSearchText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"typeToSearchTemplate || defaultTypeToSearchTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"loading && itemsList.filteredItems.length === 0\">\n        <ng-template #defaultLoadingTextTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{loadingText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingTextTemplate || defaultLoadingTextTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n</ng-dropdown-panel>\n", styles: ["@charset \"UTF-8\";.ng-select{position:relative;display:block;box-sizing:border-box}.ng-select div,.ng-select input,.ng-select span{box-sizing:border-box}.ng-select [hidden]{display:none}.ng-select.ng-select-searchable .ng-select-container .ng-value-container .ng-input{opacity:1}.ng-select.ng-select-opened .ng-select-container{z-index:1001}.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-placeholder,.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-value{-webkit-user-select:none;user-select:none;cursor:default}.ng-select.ng-select-disabled .ng-arrow-wrapper{cursor:default}.ng-select.ng-select-filtered .ng-placeholder{display:none}.ng-select .ng-select-container{cursor:default;display:flex;outline:none;overflow:hidden;position:relative;width:100%}.ng-select .ng-select-container .ng-value-container{display:flex;flex:1}.ng-select .ng-select-container .ng-value-container .ng-input{opacity:0}.ng-select .ng-select-container .ng-value-container .ng-input>input{box-sizing:content-box;background:none transparent;border:0 none;box-shadow:none;outline:none;padding:0;cursor:default;width:100%}.ng-select .ng-select-container .ng-value-container .ng-input>input::-ms-clear{display:none}.ng-select .ng-select-container .ng-value-container .ng-input>input[readonly]{-webkit-user-select:none;user-select:none;width:0;padding:0}.ng-select.ng-select-single.ng-select-filtered .ng-select-container .ng-value-container .ng-value{visibility:hidden}.ng-select.ng-select-single .ng-select-container .ng-value-container,.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-input{position:absolute;left:0;width:100%}.ng-select.ng-select-multiple.ng-select-disabled>.ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container{flex-wrap:wrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{position:absolute}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value{white-space:nowrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value.ng-value-disabled .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon{cursor:pointer}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-input{flex:1;z-index:2}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{z-index:1}.ng-select .ng-clear-wrapper{cursor:pointer;position:relative;width:17px;-webkit-user-select:none;user-select:none}.ng-select .ng-clear-wrapper .ng-clear{display:inline-block;font-size:18px;line-height:1;pointer-events:none}.ng-select .ng-spinner-loader{border-radius:50%;width:17px;height:17px;margin-right:5px;font-size:10px;position:relative;text-indent:-9999em;border-top:2px solid rgba(66,66,66,.2);border-right:2px solid rgba(66,66,66,.2);border-bottom:2px solid rgba(66,66,66,.2);border-left:2px solid #424242;transform:translateZ(0);animation:load8 .8s infinite linear}.ng-select .ng-spinner-loader:after{border-radius:50%;width:17px;height:17px}@keyframes load8{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.ng-select .ng-arrow-wrapper{cursor:pointer;position:relative;text-align:center;-webkit-user-select:none;user-select:none}.ng-select .ng-arrow-wrapper .ng-arrow{pointer-events:none;display:inline-block;height:0;width:0;position:relative}.ng-dropdown-panel{box-sizing:border-box;position:absolute;opacity:0;width:100%;z-index:1050;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .ng-dropdown-panel-items{display:block;height:auto;box-sizing:border-box;max-height:240px;overflow-y:auto}.ng-dropdown-panel .ng-dropdown-panel-items .ng-optgroup{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option{box-sizing:border-box;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .ng-option-label:empty:before{content:\"\\200b\"}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .highlighted{font-weight:700;text-decoration:underline}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.disabled{cursor:default}.ng-dropdown-panel .scroll-host{overflow:hidden;overflow-y:auto;position:relative;display:block;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .scrollable-content{top:0;left:0;width:100%;height:100%;position:absolute}.ng-dropdown-panel .total-padding{width:1px;opacity:0}.ng-select-inline .ng-select{line-height:initial}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container{overflow:hidden;flex-wrap:nowrap!important}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value{background:none;font-size:inherit}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-label{padding:0}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{position:initial!important;top:0;padding:0}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-clear-wrapper{display:none}\n"], dependencies: [{ kind: "directive", type: i3.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i3.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: i3.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i3.NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }, { kind: "component", type: i4.NgDropdownPanelComponent, selector: "ng-dropdown-panel", inputs: ["items", "markedItem", "position", "appendTo", "bufferAmount", "virtualScroll", "headerSearchTemplate", "headerTemplate", "footerTemplate", "filterValue", "dynamicWidth"], outputs: ["update", "scroll", "scrollToEnd", "outsideClick"] }, { kind: "directive", type: i5.NgItemLabelDirective, selector: "[ngItemLabel]", inputs: ["ngItemLabel", "escape"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0", ngImport: i0, type: NgSelectComponent, decorators: [{
            type: Component,
            args: [{ selector: 'ng-select', providers: [{
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(() => NgSelectComponent),
                            multi: true
                        }, NgDropdownPanelService], encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy.OnPush, template: "<div\n    (mousedown)=\"handleMousedown($event)\"\n    [class.ng-appearance-outline]=\"appearance === 'outline'\"\n    [class.ng-has-value]=\"hasValue\"\n    [class.ng-use-search-input]=\"!useSearchInPanel\"\n    class=\"ng-select-container\">\n\n    <div class=\"ng-value-container\">\n        <div class=\"ng-placeholder\">{{placeholder}}</div>\n\n        <ng-container *ngIf=\"(!multiLabelTemplate  || !multiple ) && selectedItems.length > 0\">\n            <div [class.ng-value-disabled]=\"item.disabled\" class=\"ng-value\" *ngFor=\"let item of selectedItems; trackBy: trackByOption\">\n                <ng-template #defaultLabelTemplate>\n                    <span class=\"ng-value-icon left\" (click)=\"unselect(item);\" aria-hidden=\"true\">\u00D7</span>\n                    <span class=\"ng-value-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n                </ng-template>\n\n                <ng-template\n                    [ngTemplateOutlet]=\"labelTemplate || defaultLabelTemplate\"\n                    [ngTemplateOutletContext]=\"{ item: item.value, clear: clearItem, label: item.label }\">\n                </ng-template>\n            </div>\n        </ng-container>\n\n        <ng-template *ngIf=\"multiple && multiLabelTemplate && selectedValues.length > 0\"\n                [ngTemplateOutlet]=\"multiLabelTemplate\"\n                [ngTemplateOutletContext]=\"{ items: selectedValues, clear: clearItem }\">\n        </ng-template>\n\n        <div class=\"ng-input\"\n            role=\"combobox\"\n            [attr.aria-expanded]=\"isOpen\"\n            [attr.aria-owns]=\"isOpen ? dropdownId : null\"\n            aria-haspopup=\"listbox\">\n\n            <input #searchInput\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(searchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(searchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </div>\n\n    <ng-container *ngIf=\"loading\">\n        <ng-template #defaultLoadingSpinnerTemplate>\n            <div class=\"ng-spinner-loader\"></div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingSpinnerTemplate || defaultLoadingSpinnerTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <span *ngIf=\"showClear()\" class=\"ng-clear-wrapper\" title=\"{{clearAllText}}\">\n        <span class=\"ng-clear\" aria-hidden=\"true\">\u00D7</span>\n    </span>\n\n    <span class=\"ng-arrow-wrapper\">\n        <span class=\"ng-arrow\"></span>\n    </span>\n</div>\n\n<ng-dropdown-panel *ngIf=\"isOpen\"\n                   class=\"ng-dropdown-panel\"\n                   [virtualScroll]=\"virtualScroll\"\n                   [bufferAmount]=\"bufferAmount\"\n                   [appendTo]=\"appendTo\"\n                   [position]=\"dropdownPosition\"\n                   [headerSearchTemplate]=\"useSearchInPanel ? headerSearchTemplate : null\"\n                   [headerTemplate]=\"headerTemplate\"\n                   [footerTemplate]=\"footerTemplate\"\n                   [filterValue]=\"searchTerm\"\n                   [items]=\"itemsList.filteredItems\"\n                   [markedItem]=\"itemsList.markedItem\"\n                   (update)=\"viewPortItems = $event\"\n                   (scroll)=\"scroll.emit($event)\"\n                   (scrollToEnd)=\"scrollToEnd.emit($event)\"\n                   (outsideClick)=\"close()\"\n                   [class.ng-select-multiple]=\"multiple\"\n                   [ngClass]=\"appendTo ? classes : null\"\n                   [id]=\"dropdownId\"\n                   role=\"listbox\"\n                   aria-label=\"Options list\">\n\n    <ng-template #headerSearchTemplate>\n        <div class=\"ng-select-dropdown-search m-n\">\n            <input #headerSearchInput\n                   class=\"form-control search-input\"\n                   [attr.id]=\"labelForId\"\n                   [attr.tabindex]=\"tabIndex\"\n                   [readOnly]=\"!searchable || itemsList.maxItemsSelected\"\n                   [disabled]=\"disabled\"\n                   [value]=\"searchTerm ? searchTerm : ''\"\n                   (input)=\"filter(headerSearchInput.value)\"\n                   (compositionstart)=\"onCompositionStart()\"\n                   (compositionend)=\"onCompositionEnd(headerSearchInput.value)\"\n                   (focus)=\"onInputFocus($event)\"\n                   (blur)=\"onInputBlur($event)\"\n                   (change)=\"$event.stopPropagation()\"\n                   [attr.aria-activedescendant]=\"isOpen ? itemsList?.markedItem?.htmlId : null\"\n                   aria-autocomplete=\"list\"\n                   placeholder=\"Search\"\n                   [attr.aria-controls]=\"isOpen ? dropdownId : null\">\n        </div>\n    </ng-template>\n\n    <ng-container>\n        <div class=\"ng-option\" [attr.role]=\"item.children ? 'group' : 'option'\" (click)=\"toggleItem(item)\" (mouseover)=\"onItemHover(item)\"\n                *ngFor=\"let item of viewPortItems; trackBy: trackByOption\"\n                [class.ng-option-disabled]=\"item.disabled\"\n                [class.ng-option-selected]=\"item.selected\"\n                [class.ng-optgroup]=\"item.children\"\n                [class.ng-option]=\"!item.children\"\n                [class.ng-option-child]=\"!!item.parent\"\n                [class.ng-option-marked]=\"item === itemsList.markedItem\"\n                [attr.aria-selected]=\"item.selected\"\n                [attr.id]=\"item?.htmlId\">\n\n            <ng-template #defaultOptionTemplate>\n                <span class=\"ng-option-label\" [ngItemLabel]=\"item.label\" [escape]=\"escapeHTML\"></span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"item.children ? (optgroupTemplate || defaultOptionTemplate) : (optionTemplate || defaultOptionTemplate)\"\n                [ngTemplateOutletContext]=\"{ item: item.value, item$:item, index: item.index, searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n\n        <div class=\"ng-option\" [class.ng-option-marked]=\"!itemsList.markedItem\" (mouseover)=\"itemsList.unmarkItem()\" role=\"option\" (click)=\"selectTag()\" *ngIf=\"showAddTag\">\n            <ng-template #defaultTagTemplate>\n                <span><span class=\"ng-tag-label\">{{addTagText}}</span>\"{{searchTerm}}\"</span>\n            </ng-template>\n\n            <ng-template\n                [ngTemplateOutlet]=\"tagTemplate || defaultTagTemplate\"\n                [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n            </ng-template>\n        </div>\n    </ng-container>\n\n    <ng-container *ngIf=\"showNoItemsFound()\">\n        <ng-template #defaultNotFoundTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{notFoundText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"notFoundTemplate || defaultNotFoundTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"showTypeToSearch()\">\n        <ng-template #defaultTypeToSearchTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{typeToSearchText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"typeToSearchTemplate || defaultTypeToSearchTemplate\">\n        </ng-template>\n    </ng-container>\n\n    <ng-container *ngIf=\"loading && itemsList.filteredItems.length === 0\">\n        <ng-template #defaultLoadingTextTemplate>\n            <div class=\"ng-option ng-option-disabled\">{{loadingText}}</div>\n        </ng-template>\n\n        <ng-template\n            [ngTemplateOutlet]=\"loadingTextTemplate || defaultLoadingTextTemplate\"\n            [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n        </ng-template>\n    </ng-container>\n\n</ng-dropdown-panel>\n", styles: ["@charset \"UTF-8\";.ng-select{position:relative;display:block;box-sizing:border-box}.ng-select div,.ng-select input,.ng-select span{box-sizing:border-box}.ng-select [hidden]{display:none}.ng-select.ng-select-searchable .ng-select-container .ng-value-container .ng-input{opacity:1}.ng-select.ng-select-opened .ng-select-container{z-index:1001}.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-placeholder,.ng-select.ng-select-disabled .ng-select-container .ng-value-container .ng-value{-webkit-user-select:none;user-select:none;cursor:default}.ng-select.ng-select-disabled .ng-arrow-wrapper{cursor:default}.ng-select.ng-select-filtered .ng-placeholder{display:none}.ng-select .ng-select-container{cursor:default;display:flex;outline:none;overflow:hidden;position:relative;width:100%}.ng-select .ng-select-container .ng-value-container{display:flex;flex:1}.ng-select .ng-select-container .ng-value-container .ng-input{opacity:0}.ng-select .ng-select-container .ng-value-container .ng-input>input{box-sizing:content-box;background:none transparent;border:0 none;box-shadow:none;outline:none;padding:0;cursor:default;width:100%}.ng-select .ng-select-container .ng-value-container .ng-input>input::-ms-clear{display:none}.ng-select .ng-select-container .ng-value-container .ng-input>input[readonly]{-webkit-user-select:none;user-select:none;width:0;padding:0}.ng-select.ng-select-single.ng-select-filtered .ng-select-container .ng-value-container .ng-value{visibility:hidden}.ng-select.ng-select-single .ng-select-container .ng-value-container,.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-input{position:absolute;left:0;width:100%}.ng-select.ng-select-multiple.ng-select-disabled>.ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container{flex-wrap:wrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{position:absolute}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value{white-space:nowrap}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value.ng-value-disabled .ng-value-icon{display:none}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon{cursor:pointer}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-input{flex:1;z-index:2}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{z-index:1}.ng-select .ng-clear-wrapper{cursor:pointer;position:relative;width:17px;-webkit-user-select:none;user-select:none}.ng-select .ng-clear-wrapper .ng-clear{display:inline-block;font-size:18px;line-height:1;pointer-events:none}.ng-select .ng-spinner-loader{border-radius:50%;width:17px;height:17px;margin-right:5px;font-size:10px;position:relative;text-indent:-9999em;border-top:2px solid rgba(66,66,66,.2);border-right:2px solid rgba(66,66,66,.2);border-bottom:2px solid rgba(66,66,66,.2);border-left:2px solid #424242;transform:translateZ(0);animation:load8 .8s infinite linear}.ng-select .ng-spinner-loader:after{border-radius:50%;width:17px;height:17px}@keyframes load8{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.ng-select .ng-arrow-wrapper{cursor:pointer;position:relative;text-align:center;-webkit-user-select:none;user-select:none}.ng-select .ng-arrow-wrapper .ng-arrow{pointer-events:none;display:inline-block;height:0;width:0;position:relative}.ng-dropdown-panel{box-sizing:border-box;position:absolute;opacity:0;width:100%;z-index:1050;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .ng-dropdown-panel-items{display:block;height:auto;box-sizing:border-box;max-height:240px;overflow-y:auto}.ng-dropdown-panel .ng-dropdown-panel-items .ng-optgroup{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option{box-sizing:border-box;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .ng-option-label:empty:before{content:\"\\200b\"}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .highlighted{font-weight:700;text-decoration:underline}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.disabled{cursor:default}.ng-dropdown-panel .scroll-host{overflow:hidden;overflow-y:auto;position:relative;display:block;-webkit-overflow-scrolling:touch}.ng-dropdown-panel .scrollable-content{top:0;left:0;width:100%;height:100%;position:absolute}.ng-dropdown-panel .total-padding{width:1px;opacity:0}.ng-select-inline .ng-select{line-height:initial}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container{overflow:hidden;flex-wrap:nowrap!important}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value{background:none;font-size:inherit}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-label{padding:0}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon{display:none}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-placeholder{position:initial!important;top:0;padding:0}.ng-select-inline .ng-select.ng-select-multiple .ng-select-container .ng-clear-wrapper{display:none}\n"] }]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctc2VsZWN0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9uZy1zZWxlY3QvbGliL25nLXNlbGVjdC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9zcmMvbmctc2VsZWN0L2xpYi9uZy1zZWxlY3QuY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNILFNBQVMsRUFLVCxVQUFVLEVBRVYsS0FBSyxFQUNMLE1BQU0sRUFDTixZQUFZLEVBQ1osWUFBWSxFQUNaLFdBQVcsRUFDWCxpQkFBaUIsRUFDakIsWUFBWSxFQUNaLFdBQVcsRUFDWCxTQUFTLEVBRVQsdUJBQXVCLEVBQ3ZCLE1BQU0sRUFFTixlQUFlLEVBRWYsY0FBYyxFQUNkLFNBQVMsRUFDWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQXdCLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFdEMsT0FBTyxFQUNILHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLHlCQUF5QixFQUN6QiwyQkFBMkIsRUFDM0IsMkJBQTJCLEVBQzNCLCtCQUErQixFQUMvQiw4QkFBOEIsRUFDOUIsNkJBQTZCLEVBQzdCLHNCQUFzQixFQUN0QixpQ0FBaUMsRUFDcEMsTUFBTSwwQkFBMEIsQ0FBQztBQUdsQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDekMsT0FBTyxFQUFZLE9B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ZUFBZTtzQkFBOUMsV0FBVzt1QkFBQyxpQkFBaUI7Z0JBRWUsUUFBUTtzQkFBcEQsV0FBVzt1QkFBQywwQkFBMEI7Z0JBRU0sUUFBUTtzQkFBcEQsV0FBVzt1QkFBQywwQkFBMEI7Z0JBRUksTUFBTTtzQkFBaEQsV0FBVzt1QkFBQyx3QkFBd0I7Z0JBRVUsaUJBQWlCO3NCQUEvRCxXQUFXO3VCQUFDLDRCQUE0QjtnQkFzR3pDLGFBQWE7c0JBRFosWUFBWTt1QkFBQyxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIENvbXBvbmVudCxcbiAgICBPbkNoYW5nZXMsXG4gICAgT25EZXN0cm95LFxuICAgIE9uSW5pdCxcbiAgICBBZnRlclZpZXdJbml0LFxuICAgIGZvcndhcmRSZWYsXG4gICAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICAgSW5wdXQsXG4gICAgT3V0cHV0LFxuICAgIEV2ZW50RW1pdHRlcixcbiAgICBDb250ZW50Q2hpbGQsXG4gICAgVGVtcGxhdGVSZWYsXG4gICAgVmlld0VuY2Fwc3VsYXRpb24sXG4gICAgSG9zdExpc3RlbmVyLFxuICAgIEhvc3RCaW5kaW5nLFxuICAgIFZpZXdDaGlsZCxcbiAgICBFbGVtZW50UmVmLFxuICAgIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICAgIEluamVjdCxcbiAgICBTaW1wbGVDaGFuZ2VzLFxuICAgIENvbnRlbnRDaGlsZHJlbixcbiAgICBRdWVyeUxpc3QsXG4gICAgSW5qZWN0aW9uVG9rZW4sXG4gICAgQXR0cmlidXRlXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQ29udHJvbFZhbHVlQWNjZXNzb3IsIE5HX1ZBTFVFX0FDQ0VTU09SIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgdGFrZVVudGlsLCBzdGFydFdpdGgsIHRhcCwgZGVib3VuY2VUaW1lLCBtYXAsIGZpbHRlciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IFN1YmplY3QsIG1lcmdlIH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7XG4gICAgTmdPcHRpb25UZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ0xhYmVsVGVtcGxhdGVEaXJlY3RpdmUsXG4gICAgTmdIZWFkZXJUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ0Zvb3RlclRlbXBsYXRlRGlyZWN0aXZlLFxuICAgIE5nT3B0Z3JvdXBUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ05vdEZvdW5kVGVtcGxhdGVEaXJlY3RpdmUsXG4gICAgTmdUeXBlVG9TZWFyY2hUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ0xvYWRpbmdUZXh0VGVtcGxhdGVEaXJlY3RpdmUsXG4gICAgTmdNdWx0aUxhYmVsVGVtcGxhdGVEaXJlY3RpdmUsXG4gICAgTmdUYWdUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgICBOZ0xvYWRpbmdTcGlubmVyVGVtcGxhdGVEaXJlY3RpdmVcbn0gZnJvbSAnLi9uZy10ZW1wbGF0ZXMuZGlyZWN0aXZlJztcblxuaW1wb3J0IHsgQ29uc29sZVNlcnZpY2UgfSBmcm9tICcuL2NvbnNvbGUuc2VydmljZSc7XG5pbXBvcnQgeyBpc0RlZmluZWQsIGlzRnVuY3Rpb24sIGlzUHJvbWlzZSwgaXNPYmplY3QgfSBmcm9tICcuL3ZhbHVlLXV0aWxzJztcbmltcG9ydCB7IEl0ZW1zTGlzdCB9IGZyb20gJy4vaXRlbXMtbGlzdCc7XG5pbXBvcnQgeyBOZ09wdGlvbiwgS2V5Q29kZSwgRHJvcGRvd25Qb3NpdGlvbiB9IGZyb20gJy4vbmctc2VsZWN0LnR5cGVzJztcbmltcG9ydCB7IG5ld0lkIH0gZnJvbSAnLi9pZCc7XG5pbXBvcnQgeyBOZ0Ryb3Bkb3duUGFuZWxDb21wb25lbnQgfSBmcm9tICcuL25nLWRyb3Bkb3duLXBhbmVsLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBOZ09wdGlvbkNvbXBvbmVudCB9IGZyb20gJy4vbmctb3B0aW9uLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBTZWxlY3Rpb25Nb2RlbEZhY3RvcnkgfSBmcm9tICcuL3NlbGVjdGlvbi1tb2RlbCc7XG5pbXBvcnQgeyBOZ1NlbGVjdENvbmZpZyB9IGZyb20gJy4vY29uZmlnLnNlcnZpY2UnO1xuaW1wb3J0IHsgTmdEcm9wZG93blBhbmVsU2VydmljZSB9IGZyb20gJy4vbmctZHJvcGRvd24tcGFuZWwuc2VydmljZSc7XG5cbmV4cG9ydCBjb25zdCBTRUxFQ1RJT05fTU9ERUxfRkFDVE9SWSA9IG5ldyBJbmplY3Rpb25Ub2tlbjxTZWxlY3Rpb25Nb2RlbEZhY3Rvcnk+KCduZy1zZWxlY3Qtc2VsZWN0aW9uLW1vZGVsJyk7XG5leHBvcnQgdHlwZSBBZGRUYWdGbiA9ICgodGVybTogc3RyaW5nKSA9PiBhbnkgfCBQcm9taXNlPGFueT4pO1xuZXhwb3J0IHR5cGUgQ29tcGFyZVdpdGhGbiA9IChhOiBhbnksIGI6IGFueSkgPT4gYm9vbGVhbjtcbmV4cG9ydCB0eXBlIEdyb3VwVmFsdWVGbiA9IChrZXk6IHN0cmluZyB8IGFueSwgY2hpbGRyZW46IGFueVtdKSA9PiBzdHJpbmcgfCBhbnk7XG5cbkBDb21wb25lbnQoe1xuICAgIHNlbGVjdG9yOiAnbmctc2VsZWN0JyxcbiAgICB0ZW1wbGF0ZVVybDogJy4vbmctc2VsZWN0LmNvbXBvbmVudC5odG1sJyxcbiAgICBzdHlsZVVybHM6IFsnLi9uZy1zZWxlY3QuY29tcG9uZW50LnNjc3MnXSxcbiAgICBwcm92aWRlcnM6IFt7XG4gICAgICAgIHByb3ZpZGU6IE5HX1ZBTFVFX0FDQ0VTU09SLFxuICAgICAgICB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBOZ1NlbGVjdENvbXBvbmVudCksXG4gICAgICAgIG11bHRpOiB0cnVlXG4gICAgfSwgTmdEcm9wZG93blBhbmVsU2VydmljZV0sXG4gICAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgTmdTZWxlY3RDb21wb25lbnQgaW1wbGVtZW50cyBPbkRlc3Ryb3ksIE9uQ2hhbmdlcywgT25Jbml0LCBBZnRlclZpZXdJbml0LCBDb250cm9sVmFsdWVBY2Nlc3NvciB7XG5cbiAgICBASW5wdXQoKSBiaW5kTGFiZWw6IHN0cmluZztcbiAgICBASW5wdXQoKSBiaW5kVmFsdWU6IHN0cmluZztcbiAgICBASW5wdXQoKSBtYXJrRmlyc3QgPSB0cnVlO1xuICAgIEBJbnB1dCgpIHBsYWNlaG9sZGVyOiBzdHJpbmc7XG4gICAgQElucHV0KCkgbm90Rm91bmRUZXh0OiBzdHJpbmc7XG4gICAgQElucHV0KCkgdHlwZVRvU2VhcmNoVGV4dDogc3RyaW5nO1xuICAgIEBJbnB1dCgpIGFkZFRhZ1RleHQ6IHN0cmluZztcbiAgICBASW5wdXQoKSBsb2FkaW5nVGV4dDogc3RyaW5nO1xuICAgIEBJbnB1dCgpIGNsZWFyQWxsVGV4dDogc3RyaW5nO1xuICAgIEBJbnB1dCgpIGFwcGVhcmFuY2U6IHN0cmluZztcbiAgICBASW5wdXQoKSBkcm9wZG93blBvc2l0aW9uOiBEcm9wZG93blBvc2l0aW9uID0gJ2F1dG8nO1xuICAgIEBJbnB1dCgpIGFwcGVuZFRvOiBzdHJpbmc7XG4gICAgQElucHV0KCkgbG9hZGluZyA9IGZhbHNlO1xuICAgIEBJbnB1dCgpIGNsb3NlT25TZWxlY3QgPSB0cnVlO1xuICAgIEBJbnB1dCgpIGhpZGVTZWxlY3RlZCA9IGZhbHNlO1xuICAgIEBJbnB1dCgpIHNlbGVjdE9uVGFiID0gZmFsc2U7XG4gICAgQElucHV0KCkgb3Blbk9uRW50ZXI6IGJvb2xlYW47XG4gICAgQElucHV0KCkgbWF4U2VsZWN0ZWRJdGVtczogbnVtYmVyO1xuICAgIEBJbnB1dCgpIGdyb3VwQnk6IHN0cmluZyB8ICgodmFsdWU6IGFueSkgPT4gYW55KTtcbiAgICBASW5wdXQoKSBncm91cFZhbHVlOiBHcm91cFZhbHVlRm47XG4gICAgQElucHV0KCkgYnVmZmVyQW1vdW50ID0gNDtcbiAgICBASW5wdXQoKSB2aXJ0dWFsU2Nyb2xsOiBib29sZWFuO1xuICAgIEBJbnB1dCgpIHNlbGVjdGFibGVHcm91cCA9IGZhbHNlO1xuICAgIEBJbnB1dCgpIHNlbGVjdGFibGVHcm91cEFzTW9kZWwgPSB0cnVlO1xuICAgIEBJbnB1dCgpIHNlYXJjaEZuID0gbnVsbDtcbiAgICBASW5wdXQoKSB0cmFja0J5Rm4gPSBudWxsO1xuICAgIEBJbnB1dCgpIGNsZWFyT25CYWNrc3BhY2UgPSB0cnVlO1xuICAgIEBJbnB1dCgpIGxhYmVsRm9ySWQgPSBudWxsO1xuICAgIEBJbnB1dCgpIGlucHV0QXR0cnM6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcbiAgICBASW5wdXQoKSB0YWJJbmRleDogbnVtYmVyO1xuICAgIEBJbnB1dCgpIHJlYWRvbmx5ID0gZmFsc2U7XG4gICAgQElucHV0KCkgc2VhcmNoV2hpbGVDb21wb3NpbmcgPSB0cnVlO1xuICAgIEBJbnB1dCgpIG1pblRlcm1MZW5ndGggPSAwO1xuICAgIEBJbnB1dCgpIGVkaXRhYmxlU2VhcmNoVGVybSA9IGZhbHNlO1xuICAgIEBJbnB1dCgpIGtleURvd25GbiA9IChfOiBLZXlib2FyZEV2ZW50KSA9PiB0cnVlO1xuICAgIEBJbnB1dCgpIHNlYXJjaGFibGUgPSB0cnVlO1xuICAgIC8vIEZsYWcgZm9yIHVzaW5nIHNlYXJjaCBpbnB1dCBpbiBkcm9wZG93biBwYW5lbC4gV2hlbiB0cnVlIC0gaXQgd2lsbCBoaWRlIGRlZmF1bHQgc2VhcmNoIGlucHV0LlxuICAgIEBJbnB1dCgpIHVzZVNlYXJjaEluUGFuZWwgPSBmYWxzZTtcblxuICAgIEBJbnB1dCgpIEBIb3N0QmluZGluZygnY2xhc3Mubmctc2VsZWN0LXR5cGVhaGVhZCcpIHR5cGVhaGVhZDogU3ViamVjdDxzdHJpbmc+O1xuICAgIEBJbnB1dCgpIEBIb3N0QmluZGluZygnY2xhc3Mubmctc2VsZWN0LW11bHRpcGxlJykgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICBASW5wdXQoKSBASG9zdEJpbmRpbmcoJ2NsYXNzLm5nLXNlbGVjdC10YWdnYWJsZScpIGFkZFRhZzogYm9vbGVhbiB8IEFkZFRhZ0ZuID0gZmFsc2U7XG4gICAgQElucHV0KCkgQEhvc3RCaW5kaW5nKCdjbGFzcy5uZy1zZWxlY3QtY2xlYXJhYmxlJykgY2xlYXJhYmxlID0gdHJ1ZTtcbiAgICBASW5wdXQoKSBASG9zdEJpbmRpbmcoJ2NsYXNzLm5nLXNlbGVjdC1vcGVuZWQnKSBpc09wZW4gPSBmYWxzZTtcblxuICAgIEBJbnB1dCgpXG4gICAgZ2V0IGl0ZW1zKCkgeyByZXR1cm4gdGhpcy5faXRlbXMgfTtcblxuICAgIHNldCBpdGVtcyh2YWx1ZTogYW55W10gfCBudWxsKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pdGVtc0FyZVVzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9pdGVtcyA9IHZhbHVlO1xuICAgIH07XG5cbiAgICBASW5wdXQoKVxuICAgIGdldCBjb21wYXJlV2l0aCgpIHsgcmV0dXJuIHRoaXMuX2NvbXBhcmVXaXRoOyB9XG5cbiAgICBzZXQgY29tcGFyZVdpdGgoZm46IENvbXBhcmVXaXRoRm4pIHtcbiAgICAgICAgaWYgKGZuICE9PSB1bmRlZmluZWQgJiYgZm4gIT09IG51bGwgJiYgIWlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignYGNvbXBhcmVXaXRoYCBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY29tcGFyZVdpdGggPSBmbjtcbiAgICB9XG5cbiAgICBASW5wdXQoKVxuICAgIGdldCBjbGVhclNlYXJjaE9uQWRkKCkge1xuICAgICAgICBpZiAoaXNEZWZpbmVkKHRoaXMuX2NsZWFyU2VhcmNoT25BZGQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2xlYXJTZWFyY2hPbkFkZDtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RlZmluZWQodGhpcy5jb25maWcuY2xlYXJTZWFyY2hPbkFkZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5jbGVhclNlYXJjaE9uQWRkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmNsb3NlT25TZWxlY3Q7XG4gICAgfTtcblxuICAgIHNldCBjbGVhclNlYXJjaE9uQWRkKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2NsZWFyU2VhcmNoT25BZGQgPSB2YWx1ZTtcbiAgICB9O1xuXG4gICAgLy8gb3V0cHV0IGV2ZW50c1xuICAgIEBPdXRwdXQoJ2JsdXInKSBibHVyRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgnZm9jdXMnKSBmb2N1c0V2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIEBPdXRwdXQoJ2NoYW5nZScpIGNoYW5nZUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIEBPdXRwdXQoJ29wZW4nKSBvcGVuRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgQE91dHB1dCgnY2xvc2UnKSBjbG9zZUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIEBPdXRwdXQoJ3NlYXJjaCcpIHNlYXJjaEV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcjx7IHRlcm06IHN0cmluZywgaXRlbXM6IGFueVtdIH0+KCk7XG4gICAgQE91dHB1dCgnY2xlYXInKSBjbGVhckV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIEBPdXRwdXQoJ2FkZCcpIGFkZEV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIEBPdXRwdXQoJ3JlbW92ZScpIHJlbW92ZUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIEBPdXRwdXQoJ3Njcm9sbCcpIHNjcm9sbCA9IG5ldyBFdmVudEVtaXR0ZXI8eyBzdGFydDogbnVtYmVyOyBlbmQ6IG51bWJlciB9PigpO1xuICAgIEBPdXRwdXQoJ3Njcm9sbFRvRW5kJykgc2Nyb2xsVG9FbmQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICAvLyBjdXN0b20gdGVtcGxhdGVzXG4gICAgQENvbnRlbnRDaGlsZChOZ09wdGlvblRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIG9wdGlvblRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICAgIEBDb250ZW50Q2hpbGQoTmdPcHRncm91cFRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIG9wdGdyb3VwVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ0xhYmVsVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgbGFiZWxUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBAQ29udGVudENoaWxkKE5nTXVsdGlMYWJlbFRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIG11bHRpTGFiZWxUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgICBAQ29udGVudENoaWxkKE5nSGVhZGVyVGVtcGxhdGVEaXJlY3RpdmUsIHsgcmVhZDogVGVtcGxhdGVSZWYgfSkgaGVhZGVyVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ0Zvb3RlclRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIGZvb3RlclRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICAgIEBDb250ZW50Q2hpbGQoTmdOb3RGb3VuZFRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIG5vdEZvdW5kVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ1R5cGVUb1NlYXJjaFRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIHR5cGVUb1NlYXJjaFRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICAgIEBDb250ZW50Q2hpbGQoTmdMb2FkaW5nVGV4dFRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIGxvYWRpbmdUZXh0VGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQENvbnRlbnRDaGlsZChOZ1RhZ1RlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIHRhZ1RlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICAgIEBDb250ZW50Q2hpbGQoTmdMb2FkaW5nU3Bpbm5lclRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pIGxvYWRpbmdTcGlubmVyVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG5cbiAgICBAVmlld0NoaWxkKCdoZWFkZXJTZWFyY2hJbnB1dCcsIHtzdGF0aWM6IGZhbHNlfSkgaGVhZGVyU2VhcmNoSW5wdXQ6IEVsZW1lbnRSZWY8SFRNTElucHV0RWxlbWVudD47XG4gICAgQFZpZXdDaGlsZChmb3J3YXJkUmVmKCgpID0+IE5nRHJvcGRvd25QYW5lbENvbXBvbmVudCkpIGRyb3Bkb3duUGFuZWw6IE5nRHJvcGRvd25QYW5lbENvbXBvbmVudDtcbiAgICBAVmlld0NoaWxkKCdzZWFyY2hJbnB1dCcsIHsgc3RhdGljOiB0cnVlIH0pIHNlYXJjaElucHV0OiBFbGVtZW50UmVmPEhUTUxJbnB1dEVsZW1lbnQ+O1xuICAgIEBDb250ZW50Q2hpbGRyZW4oTmdPcHRpb25Db21wb25lbnQsIHsgZGVzY2VuZGFudHM6IHRydWUgfSkgbmdPcHRpb25zOiBRdWVyeUxpc3Q8TmdPcHRpb25Db21wb25lbnQ+O1xuXG4gICAgQEhvc3RCaW5kaW5nKCdjbGFzcy5uZy1zZWxlY3QnKSB1c2VEZWZhdWx0Q2xhc3MgPSB0cnVlO1xuXG4gICAgQEhvc3RCaW5kaW5nKCdjbGFzcy5uZy1zZWxlY3QtZGlzYWJsZWQnKSBnZXQgZGlzYWJsZWQoKSB7IHJldHVybiB0aGlzLnJlYWRvbmx5IHx8IHRoaXMuX2Rpc2FibGVkIH07XG5cbiAgICBASG9zdEJpbmRpbmcoJ2NsYXNzLm5nLXNlbGVjdC1maWx0ZXJlZCcpIGdldCBmaWx0ZXJlZCgpIHsgcmV0dXJuICghIXRoaXMuc2VhcmNoVGVybSAmJiB0aGlzLnNlYXJjaGFibGUgfHwgdGhpcy5faXNDb21wb3NpbmcpIH07XG5cbiAgICBASG9zdEJpbmRpbmcoJ2NsYXNzLm5nLXNlbGVjdC1zaW5nbGUnKSBnZXQgc2luZ2xlKCkgeyByZXR1cm4gIXRoaXMubXVsdGlwbGUgfTtcblxuICAgIEBIb3N0QmluZGluZygnY2xhc3Mubmctc2VsZWN0LXNlYXJjaGFibGUnKSBnZXQgc2VhcmNoYWJsZU5vUGFuZWwoKSB7IHJldHVybiB0aGlzLnNlYXJjaGFibGUgJiYgIXRoaXMudXNlU2VhcmNoSW5QYW5lbCB9O1xuXG4gICAgaXRlbXNMaXN0OiBJdGVtc0xpc3Q7XG4gICAgdmlld1BvcnRJdGVtczogTmdPcHRpb25bXSA9IFtdO1xuICAgIHNlYXJjaFRlcm06IHN0cmluZyA9IG51bGw7XG4gICAgZHJvcGRvd25JZCA9IG5ld0lkKCk7XG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQ7XG4gICAgZm9jdXNlZDogYm9vbGVhbjtcbiAgICBlc2NhcGVIVE1MID0gdHJ1ZTtcblxuICAgIHByaXZhdGUgX2l0ZW1zID0gW107XG4gICAgcHJpdmF0ZSBfaXRlbXNBcmVVc2VkOiBib29sZWFuO1xuICAgIHByaXZhdGUgX2RlZmF1bHRMYWJlbCA9ICdsYWJlbCc7XG4gICAgcHJpdmF0ZSBfcHJpbWl0aXZlO1xuICAgIHByaXZhdGUgX21hbnVhbE9wZW46IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBfZGlzYWJsZWQ6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBfcHJlc3NlZEtleXM6IHN0cmluZ1tdID0gW107XG4gICAgcHJpdmF0ZSBfY29tcGFyZVdpdGg6IENvbXBhcmVXaXRoRm47XG4gICAgcHJpdmF0ZSBfY2xlYXJTZWFyY2hPbkFkZDogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9pc0NvbXBvc2luZyA9IGZhbHNlO1xuXG4gICAgcHJpdmF0ZSBnZXQgX2VkaXRhYmxlU2VhcmNoVGVybSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWRpdGFibGVTZWFyY2hUZXJtICYmICF0aGlzLm11bHRpcGxlO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Rlc3Ryb3kkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9rZXlQcmVzcyQgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgcHJpdmF0ZSBfb25DaGFuZ2UgPSAoXzogYW55KSA9PiB7IH07XG4gICAgcHJpdmF0ZSBfb25Ub3VjaGVkID0gKCkgPT4geyB9O1xuXG4gICAgY2xlYXJJdGVtID0gKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBvcHRpb24gPSB0aGlzLnNlbGVjdGVkSXRlbXMuZmluZCh4ID0+IHgudmFsdWUgPT09IGl0ZW0pO1xuICAgICAgICB0aGlzLnVuc2VsZWN0KG9wdGlvbik7XG4gICAgfTtcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBAQXR0cmlidXRlKCdjbGFzcycpIHB1YmxpYyBjbGFzc2VzOiBzdHJpbmcsXG4gICAgICAgIEBBdHRyaWJ1dGUoJ2F1dG9mb2N1cycpIHByaXZhdGUgYXV0b0ZvY3VzOiBhbnksXG4gICAgICAgIHB1YmxpYyBjb25maWc6IE5nU2VsZWN0Q29uZmlnLFxuICAgICAgICBASW5qZWN0KFNFTEVDVElPTl9NT0RFTF9GQUNUT1JZKSBuZXdTZWxlY3Rpb25Nb2RlbDogU2VsZWN0aW9uTW9kZWxGYWN0b3J5LFxuICAgICAgICBfZWxlbWVudFJlZjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4sXG4gICAgICAgIHByaXZhdGUgX2NkOiBDaGFuZ2VEZXRlY3RvclJlZixcbiAgICAgICAgcHJpdmF0ZSBfY29uc29sZTogQ29uc29sZVNlcnZpY2VcbiAgICApIHtcbiAgICAgICAgdGhpcy5fbWVyZ2VHbG9iYWxDb25maWcoY29uZmlnKTtcbiAgICAgICAgdGhpcy5pdGVtc0xpc3QgPSBuZXcgSXRlbXNMaXN0KHRoaXMsIG5ld1NlbGVjdGlvbk1vZGVsKCkpO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBfZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50O1xuICAgIH1cblxuICAgIGdldCBzZWxlY3RlZEl0ZW1zKCk6IE5nT3B0aW9uW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5pdGVtc0xpc3Quc2VsZWN0ZWRJdGVtcztcbiAgICB9XG5cbiAgICBnZXQgc2VsZWN0ZWRWYWx1ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdGVkSXRlbXMubWFwKHggPT4geC52YWx1ZSk7XG4gICAgfVxuXG4gICAgZ2V0IGhhc1ZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDA7XG4gICAgfVxuXG4gICAgZ2V0IGN1cnJlbnRQYW5lbFBvc2l0aW9uKCk6IERyb3Bkb3duUG9zaXRpb24ge1xuICAgICAgICBpZiAodGhpcy5kcm9wZG93blBhbmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kcm9wZG93blBhbmVsLmN1cnJlbnRQb3NpdGlvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIG5nT25Jbml0KCkge1xuICAgICAgICB0aGlzLl9oYW5kbGVLZXlQcmVzc2VzKCk7XG4gICAgICAgIHRoaXMuX3NldElucHV0QXR0cmlidXRlcygpO1xuICAgIH1cblxuICAgIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICAgICAgaWYgKGNoYW5nZXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LmNsZWFyU2VsZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hhbmdlcy5pdGVtcykge1xuICAgICAgICAgICAgdGhpcy5fc2V0SXRlbXMoY2hhbmdlcy5pdGVtcy5jdXJyZW50VmFsdWUgfHwgW10pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VzLmlzT3Blbikge1xuICAgICAgICAgICAgdGhpcy5fbWFudWFsT3BlbiA9IGlzRGVmaW5lZChjaGFuZ2VzLmlzT3Blbi5jdXJyZW50VmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmdBZnRlclZpZXdJbml0KCkge1xuICAgICAgICBpZiAoIXRoaXMuX2l0ZW1zQXJlVXNlZCkge1xuICAgICAgICAgICAgdGhpcy5lc2NhcGVIVE1MID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9zZXRJdGVtc0Zyb21OZ09wdGlvbnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0RlZmluZWQodGhpcy5hdXRvRm9jdXMpKSB7XG4gICAgICAgICAgICB0aGlzLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZ09uRGVzdHJveSgpIHtcbiAgICAgICAgdGhpcy5fZGVzdHJveSQubmV4dCgpO1xuICAgICAgICB0aGlzLl9kZXN0cm95JC5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIEBIb3N0TGlzdGVuZXIoJ2tleWRvd24nLCBbJyRldmVudCddKVxuICAgIGhhbmRsZUtleURvd24oJGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgICAgIGNvbnN0IGtleUNvZGUgPSBLZXlDb2RlWyRldmVudC53aGljaF07XG4gICAgICAgIGlmIChrZXlDb2RlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5rZXlEb3duRm4oJGV2ZW50KSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUtleUNvZGUoJGV2ZW50KVxuICAgICAgICB9IGVsc2UgaWYgKCRldmVudC5rZXkgJiYgJGV2ZW50LmtleS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2tleVByZXNzJC5uZXh0KCRldmVudC5rZXkudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBoYW5kbGVLZXlDb2RlKCRldmVudDogS2V5Ym9hcmRFdmVudCkge1xuICAgICAgICBzd2l0Y2ggKCRldmVudC53aGljaCkge1xuICAgICAgICBjYXNlIEtleUNvZGUuQXJyb3dEb3duOlxuICAgICAgICAgICAgdGhpcy5faGFuZGxlQXJyb3dEb3duKCRldmVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBLZXlDb2RlLkFycm93VXA6XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVBcnJvd1VwKCRldmVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBLZXlDb2RlLlNwYWNlOlxuICAgICAgICAgICAgdGhpcy5faGFuZGxlU3BhY2UoJGV2ZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEtleUNvZGUuRW50ZXI6XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVFbnRlcigkZXZlbnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgS2V5Q29kZS5UYWI6XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVUYWIoJGV2ZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEtleUNvZGUuRXNjOlxuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBLZXlDb2RlLkJhY2tzcGFjZTpcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZUJhY2tzcGFjZSgpO1xuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhhbmRsZU1vdXNlZG93bigkZXZlbnQ6IE1vdXNlRXZlbnQpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gJGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgaWYgKHRhcmdldC50YWdOYW1lICE9PSAnSU5QVVQnKSB7XG4gICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCduZy1jbGVhci13cmFwcGVyJykpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlQ2xlYXJDbGljaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ25nLWFycm93LXdyYXBwZXInKSkge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVBcnJvd0NsaWNrKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnbmctdmFsdWUtaWNvbicpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuZm9jdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2VhcmNoYWJsZSkge1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRvZ2dsZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaGFuZGxlQXJyb3dDbGljaygpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNPcGVuKSB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhhbmRsZUNsZWFyQ2xpY2soKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc1ZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5jbGVhclNlbGVjdGVkKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlTmdNb2RlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NsZWFyU2VhcmNoKCk7XG4gICAgICAgIHRoaXMuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5jbGVhckV2ZW50LmVtaXQoKTtcblxuICAgICAgICB0aGlzLl9vblNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICB9XG5cbiAgICBjbGVhck1vZGVsKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xlYXJhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pdGVtc0xpc3QuY2xlYXJTZWxlY3RlZCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVOZ01vZGVsKCk7XG4gICAgfVxuXG4gICAgd3JpdGVWYWx1ZSh2YWx1ZTogYW55IHwgYW55W10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5pdGVtc0xpc3QuY2xlYXJTZWxlY3RlZCgpO1xuICAgICAgICB0aGlzLl9oYW5kbGVXcml0ZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fY2QubWFya0ZvckNoZWNrKCk7XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJPbkNoYW5nZShmbjogYW55KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlID0gZm47XG4gICAgfVxuXG4gICAgcmVnaXN0ZXJPblRvdWNoZWQoZm46IGFueSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9vblRvdWNoZWQgPSBmbjtcbiAgICB9XG5cbiAgICBzZXREaXNhYmxlZFN0YXRlKHN0YXRlOiBib29sZWFuKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Rpc2FibGVkID0gc3RhdGU7XG4gICAgICAgIHRoaXMuX2NkLm1hcmtGb3JDaGVjaygpO1xuICAgIH1cblxuICAgIHRvZ2dsZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT3Blbikge1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvcGVuKGZvcmNlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKCFmb3JjZSAmJiAodGhpcy5kaXNhYmxlZCB8fCB0aGlzLmlzT3BlbiB8fCB0aGlzLl9tYW51YWxPcGVuIHx8IHRoaXMuaXRlbXNMaXN0Lm1heEl0ZW1zU2VsZWN0ZWQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuX2lzVHlwZWFoZWFkICYmICF0aGlzLmFkZFRhZyAmJiB0aGlzLml0ZW1zTGlzdC5ub0l0ZW1zVG9TZWxlY3QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzT3BlbiA9IHRydWU7XG4gICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcmtTZWxlY3RlZE9yRGVmYXVsdCh0aGlzLm1hcmtGaXJzdCk7XG4gICAgICAgIHRoaXMub3BlbkV2ZW50LmVtaXQoKTtcbiAgICAgICAgaWYgKCF0aGlzLnNlYXJjaFRlcm0pIHtcbiAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRyb3Bkb3duIHBhbmVsIHRvIHJlbmRlclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgICAgIGlmKGZvcmNlKXtcbiAgICAgICAgICAgIC8vIHdoZW4gb3BlbmluZyB3YXMgZm9yY2VkIGJ5IHRoZSB1c2VkIC0gbmVlZCB0byBzY3JvbGwgdG8gc2VsZWN0ZWQgaXRlbVxuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsVG9NYXJrZWQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNPcGVuIHx8IHRoaXMuX21hbnVhbE9wZW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9pc0NvbXBvc2luZyA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMuX2VkaXRhYmxlU2VhcmNoVGVybSkge1xuICAgICAgICAgICAgdGhpcy5fY2xlYXJTZWFyY2goKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNsZWFyU2VhcmNoT25BZGQpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LnJlc2V0RmlsdGVyZWRJdGVtcygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXRlbXNMaXN0LnVubWFya0l0ZW0oKTtcbiAgICAgICAgdGhpcy5fb25Ub3VjaGVkKCk7XG4gICAgICAgIHRoaXMuY2xvc2VFdmVudC5lbWl0KCk7XG4gICAgICAgIHRoaXMuX2NkLm1hcmtGb3JDaGVjaygpO1xuICAgIH1cblxuICAgIHRvZ2dsZUl0ZW0oaXRlbTogTmdPcHRpb24pIHtcbiAgICAgICAgaWYgKCFpdGVtIHx8IGl0ZW0uZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMubXVsdGlwbGUgJiYgaXRlbS5zZWxlY3RlZCkge1xuICAgICAgICAgICAgdGhpcy51bnNlbGVjdChpdGVtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0KGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2VkaXRhYmxlU2VhcmNoVGVybSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0U2VhcmNoVGVybUZyb21JdGVtcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fb25TZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgfVxuXG4gICAgc2VsZWN0KGl0ZW06IE5nT3B0aW9uKSB7XG4gICAgICAgIGlmICghaXRlbS5zZWxlY3RlZCkge1xuICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3Quc2VsZWN0KGl0ZW0pO1xuICAgICAgICAgICAgaWYgKHRoaXMuY2xlYXJTZWFyY2hPbkFkZCAmJiAhdGhpcy5fZWRpdGFibGVTZWFyY2hUZXJtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2xlYXJTZWFyY2goKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fdXBkYXRlTmdNb2RlbCgpO1xuICAgICAgICAgICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEV2ZW50LmVtaXQoaXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jbG9zZU9uU2VsZWN0IHx8IHRoaXMuaXRlbXNMaXN0Lm5vSXRlbXNUb1NlbGVjdCkge1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9jdXMoKSB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcy51c2VTZWFyY2hJblBhbmVsID8gdGhpcy5oZWFkZXJTZWFyY2hJbnB1dCA6IHRoaXMuc2VhcmNoSW5wdXQ7XG4gICAgICAgIGlmIChpbnB1dCkge1xuICAgICAgICAgICAgaW5wdXQubmF0aXZlRWxlbWVudC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYmx1cigpIHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB0aGlzLnVzZVNlYXJjaEluUGFuZWwgPyB0aGlzLmhlYWRlclNlYXJjaElucHV0IDogdGhpcy5zZWFyY2hJbnB1dDtcbiAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgICBpbnB1dC5uYXRpdmVFbGVtZW50LmJsdXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVuc2VsZWN0KGl0ZW06IE5nT3B0aW9uKSB7XG4gICAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pdGVtc0xpc3QudW5zZWxlY3QoaXRlbSk7XG4gICAgICAgIHRoaXMuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlTmdNb2RlbCgpO1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50LmVtaXQoaXRlbSk7XG4gICAgfVxuXG4gICAgc2VsZWN0VGFnKCkge1xuICAgICAgICBsZXQgdGFnO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih0aGlzLmFkZFRhZykpIHtcbiAgICAgICAgICAgIHRhZyA9ICh0aGlzLmFkZFRhZyBhcyBBZGRUYWdGbikodGhpcy5zZWFyY2hUZXJtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhZyA9IHRoaXMuX3ByaW1pdGl2ZSA/IHRoaXMuc2VhcmNoVGVybSA6IHtbdGhpcy5iaW5kTGFiZWxdOiB0aGlzLnNlYXJjaFRlcm19O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFuZGxlVGFnID0gKGl0ZW0pID0+IHRoaXMuX2lzVHlwZWFoZWFkIHx8ICF0aGlzLmlzT3BlbiA/IHRoaXMuaXRlbXNMaXN0Lm1hcEl0ZW0oaXRlbSwgbnVsbCkgOiB0aGlzLml0ZW1zTGlzdC5hZGRJdGVtKGl0ZW0pO1xuICAgICAgICBpZiAoaXNQcm9taXNlKHRhZykpIHtcbiAgICAgICAgICAgIHRhZy50aGVuKGl0ZW0gPT4gdGhpcy5zZWxlY3QoaGFuZGxlVGFnKGl0ZW0pKSkuY2F0Y2goKCkgPT4geyB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0YWcpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0KGhhbmRsZVRhZyh0YWcpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNob3dDbGVhcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJhYmxlICYmICh0aGlzLmhhc1ZhbHVlIHx8IHRoaXMuc2VhcmNoVGVybSkgJiYgIXRoaXMuZGlzYWJsZWQ7XG4gICAgfVxuXG4gICAgdHJhY2tCeU9wdGlvbiA9IChfOiBudW1iZXIsIGl0ZW06IE5nT3B0aW9uKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnRyYWNrQnlGbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhY2tCeUZuKGl0ZW0udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfTtcblxuICAgIGdldCBzaG93QWRkVGFnKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3ZhbGlkVGVybSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGVybSA9IHRoaXMuc2VhcmNoVGVybS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVGFnICYmXG4gICAgICAgICAgICAoIXRoaXMuaXRlbXNMaXN0LmZpbHRlcmVkSXRlbXMuc29tZSh4ID0+IHgubGFiZWwudG9Mb3dlckNhc2UoKSA9PT0gdGVybSkgJiZcbiAgICAgICAgICAgICAgICAoIXRoaXMuaGlkZVNlbGVjdGVkICYmIHRoaXMuaXNPcGVuIHx8ICF0aGlzLnNlbGVjdGVkSXRlbXMuc29tZSh4ID0+IHgubGFiZWwudG9Mb3dlckNhc2UoKSA9PT0gdGVybSkpKSAmJlxuICAgICAgICAgICAgIXRoaXMubG9hZGluZztcbiAgICB9XG5cbiAgICBzaG93Tm9JdGVtc0ZvdW5kKCkge1xuICAgICAgICBjb25zdCBlbXB0eSA9IHRoaXMuaXRlbXNMaXN0LmZpbHRlcmVkSXRlbXMubGVuZ3RoID09PSAwO1xuICAgICAgICByZXR1cm4gKChlbXB0eSAmJiAhdGhpcy5faXNUeXBlYWhlYWQgJiYgIXRoaXMubG9hZGluZykgfHxcbiAgICAgICAgICAgIChlbXB0eSAmJiB0aGlzLl9pc1R5cGVhaGVhZCAmJiB0aGlzLl92YWxpZFRlcm0gJiYgIXRoaXMubG9hZGluZykpICYmXG4gICAgICAgICAgICAhdGhpcy5zaG93QWRkVGFnO1xuICAgIH1cblxuICAgIHNob3dUeXBlVG9TZWFyY2goKSB7XG4gICAgICAgIGNvbnN0IGVtcHR5ID0gdGhpcy5pdGVtc0xpc3QuZmlsdGVyZWRJdGVtcy5sZW5ndGggPT09IDA7XG4gICAgICAgIHJldHVybiBlbXB0eSAmJiB0aGlzLl9pc1R5cGVhaGVhZCAmJiAhdGhpcy5fdmFsaWRUZXJtICYmICF0aGlzLmxvYWRpbmc7XG4gICAgfVxuXG4gICAgb25Db21wb3NpdGlvblN0YXJ0KCkge1xuICAgICAgICB0aGlzLl9pc0NvbXBvc2luZyA9IHRydWU7XG4gICAgfVxuXG4gICAgb25Db21wb3NpdGlvbkVuZCh0ZXJtOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5faXNDb21wb3NpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuc2VhcmNoV2hpbGVDb21wb3NpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZmlsdGVyKHRlcm0pO1xuICAgIH1cblxuICAgIGZpbHRlcih0ZXJtOiBzdHJpbmcsIHBhcmFtcz8pIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQ29tcG9zaW5nICYmICF0aGlzLnNlYXJjaFdoaWxlQ29tcG9zaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNlYXJjaFRlcm0gPSB0ZXJtO1xuICAgICAgICBpZiAodGhpcy5faXNUeXBlYWhlYWQgJiYgKHRoaXMuX3ZhbGlkVGVybSB8fCB0aGlzLm1pblRlcm1MZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICB0aGlzLnR5cGVhaGVhZC5uZXh0KHRlcm0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLl9pc1R5cGVhaGVhZCkge1xuICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3QuZmlsdGVyKHRoaXMuc2VhcmNoVGVybSwgcGFyYW1zKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT3BlbiAmJiB0aGlzLm1hcmtGaXJzdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcmtTZWxlY3RlZE9yRGVmYXVsdCh0aGlzLm1hcmtGaXJzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMudXNlU2VhcmNoSW5QYW5lbCkge1xuICAgICAgICAgICAgdGhpcy5zZWFyY2hFdmVudC5lbWl0KHt0ZXJtLCBpdGVtczogdGhpcy5pdGVtc0xpc3QuZmlsdGVyZWRJdGVtcy5tYXAoeCA9PiB4LnZhbHVlKX0pO1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbklucHV0Rm9jdXMoJGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmZvY3VzZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9lZGl0YWJsZVNlYXJjaFRlcm0pIHtcbiAgICAgICAgICAgIHRoaXMuX3NldFNlYXJjaFRlcm1Gcm9tSXRlbXMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCduZy1zZWxlY3QtZm9jdXNlZCcpO1xuICAgICAgICB0aGlzLmZvY3VzRXZlbnQuZW1pdCgkZXZlbnQpO1xuICAgICAgICB0aGlzLmZvY3VzZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIG9uSW5wdXRCbHVyKCRldmVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnbmctc2VsZWN0LWZvY3VzZWQnKTtcbiAgICAgICAgdGhpcy5ibHVyRXZlbnQuZW1pdCgkZXZlbnQpO1xuICAgICAgICBpZiAoIXRoaXMuaXNPcGVuICYmICF0aGlzLmRpc2FibGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9vblRvdWNoZWQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fZWRpdGFibGVTZWFyY2hUZXJtKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRTZWFyY2hUZXJtRnJvbUl0ZW1zKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb2N1c2VkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgb25JdGVtSG92ZXIoaXRlbTogTmdPcHRpb24pIHtcbiAgICAgICAgaWYgKGl0ZW0uZGlzYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLml0ZW1zTGlzdC5tYXJrSXRlbShpdGVtKTtcbiAgICB9XG5cbiAgICBkZXRlY3RDaGFuZ2VzKCkge1xuICAgICAgICBpZiAoISh0aGlzLl9jZCBhcyBhbnkpLmRlc3Ryb3llZCkge1xuICAgICAgICAgICAgdGhpcy5fY2QuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0U2VhcmNoVGVybUZyb21JdGVtcygpIHtcbiAgICAgICAgLy8gZGlzYWJsZSBmb3Igbm93XG5cbiAgICAgICAgLy8gY29uc3Qgc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkSXRlbXMgJiYgdGhpcy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICAvLyB0aGlzLnNlYXJjaFRlcm0gPSAoc2VsZWN0ZWQgJiYgc2VsZWN0ZWQubGFiZWwpIHx8IG51bGw7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0SXRlbXMoaXRlbXM6IGFueVtdKSB7XG4gICAgICAgIGNvbnN0IGZpcnN0SXRlbSA9IGl0ZW1zWzBdO1xuICAgICAgICB0aGlzLmJpbmRMYWJlbCA9IHRoaXMuYmluZExhYmVsIHx8IHRoaXMuX2RlZmF1bHRMYWJlbDtcbiAgICAgICAgdGhpcy5fcHJpbWl0aXZlID0gaXNEZWZpbmVkKGZpcnN0SXRlbSkgPyAhaXNPYmplY3QoZmlyc3RJdGVtKSA6IHRoaXMuX3ByaW1pdGl2ZSB8fCB0aGlzLmJpbmRMYWJlbCA9PT0gdGhpcy5fZGVmYXVsdExhYmVsO1xuICAgICAgICB0aGlzLml0ZW1zTGlzdC5zZXRJdGVtcyhpdGVtcyk7XG4gICAgICAgIGlmIChpdGVtcy5sZW5ndGggPiAwICYmIHRoaXMuaGFzVmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcFNlbGVjdGVkSXRlbXMoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pc09wZW4gJiYgaXNEZWZpbmVkKHRoaXMuc2VhcmNoVGVybSkgJiYgIXRoaXMuX2lzVHlwZWFoZWFkKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC5maWx0ZXIodGhpcy5zZWFyY2hUZXJtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5faXNUeXBlYWhlYWQgfHwgdGhpcy5pc09wZW4pIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcmtTZWxlY3RlZE9yRGVmYXVsdCh0aGlzLm1hcmtGaXJzdCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zZXRJdGVtc0Zyb21OZ09wdGlvbnMoKSB7XG4gICAgICAgIGNvbnN0IG1hcE5nT3B0aW9ucyA9IChvcHRpb25zOiBRdWVyeUxpc3Q8TmdPcHRpb25Db21wb25lbnQ+KSA9PiB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gb3B0aW9ucy5tYXAob3B0aW9uID0+ICh7XG4gICAgICAgICAgICAgICAgJG5nT3B0aW9uVmFsdWU6IG9wdGlvbi52YWx1ZSxcbiAgICAgICAgICAgICAgICAkbmdPcHRpb25MYWJlbDogb3B0aW9uLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5pbm5lckhUTUwsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IG9wdGlvbi5kaXNhYmxlZFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3Quc2V0SXRlbXModGhpcy5pdGVtcyk7XG4gICAgICAgICAgICBpZiAodGhpcy5oYXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcFNlbGVjdGVkSXRlbXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZU9wdGlvbkNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWRPckRlc3Ryb3llZCA9IG1lcmdlKHRoaXMubmdPcHRpb25zLmNoYW5nZXMsIHRoaXMuX2Rlc3Ryb3kkKTtcbiAgICAgICAgICAgIG1lcmdlKC4uLnRoaXMubmdPcHRpb25zLm1hcChvcHRpb24gPT4gb3B0aW9uLnN0YXRlQ2hhbmdlJCkpXG4gICAgICAgICAgICAgICAgLnBpcGUodGFrZVVudGlsKGNoYW5nZWRPckRlc3Ryb3llZCkpXG4gICAgICAgICAgICAgICAgLnN1YnNjcmliZShvcHRpb24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc0xpc3QuZmluZEl0ZW0ob3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5kaXNhYmxlZCA9IG9wdGlvbi5kaXNhYmxlZDtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5sYWJlbCA9IG9wdGlvbi5sYWJlbCB8fCBpdGVtLmxhYmVsO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jZC5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5uZ09wdGlvbnMuY2hhbmdlc1xuICAgICAgICAgICAgLnBpcGUoc3RhcnRXaXRoKHRoaXMubmdPcHRpb25zKSwgdGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3kkKSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUob3B0aW9ucyA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5iaW5kTGFiZWwgPSB0aGlzLl9kZWZhdWx0TGFiZWw7XG4gICAgICAgICAgICAgICAgbWFwTmdPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGhhbmRsZU9wdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaXNWYWxpZFdyaXRlVmFsdWUodmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWlzRGVmaW5lZCh2YWx1ZSkgfHwgKHRoaXMubXVsdGlwbGUgJiYgdmFsdWUgPT09ICcnKSB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbGlkYXRlQmluZGluZyA9IChpdGVtOiBhbnkpOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgIGlmICghaXNEZWZpbmVkKHRoaXMuY29tcGFyZVdpdGgpICYmIGlzT2JqZWN0KGl0ZW0pICYmIHRoaXMuYmluZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICBgU2V0dGluZyBvYmplY3QoJHtKU09OLnN0cmluZ2lmeShpdGVtKX0pIGFzIHlvdXIgbW9kZWwgd2l0aCBiaW5kVmFsdWUgaXMgbm90IGFsbG93ZWQgdW5sZXNzIFtjb21wYXJlV2l0aF0gaXMgdXNlZC5gXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbnNvbGUud2FybignTXVsdGlwbGUgc2VsZWN0IG5nTW9kZWwgc2hvdWxkIGJlIGFycmF5LicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5ldmVyeShpdGVtID0+IHZhbGlkYXRlQmluZGluZyhpdGVtKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsaWRhdGVCaW5kaW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZVdyaXRlVmFsdWUobmdNb2RlbDogYW55IHwgYW55W10pIHtcbiAgICAgICAgaWYgKCF0aGlzLl9pc1ZhbGlkV3JpdGVWYWx1ZShuZ01vZGVsKSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZWxlY3QgPSAodmFsOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gdGhpcy5pdGVtc0xpc3QuZmluZEl0ZW0odmFsKTtcbiAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3Quc2VsZWN0KGl0ZW0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1ZhbE9iamVjdCA9IGlzT2JqZWN0KHZhbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNQcmltaXRpdmUgPSAhaXNWYWxPYmplY3QgJiYgIXRoaXMuYmluZFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICgoaXNWYWxPYmplY3QgfHwgaXNQcmltaXRpdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0LnNlbGVjdCh0aGlzLml0ZW1zTGlzdC5tYXBJdGVtKHZhbCwgbnVsbCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5iaW5kVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFt0aGlzLmJpbmRMYWJlbF06IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBbdGhpcy5iaW5kVmFsdWVdOiB2YWxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3Quc2VsZWN0KHRoaXMuaXRlbXNMaXN0Lm1hcEl0ZW0oaXRlbSwgbnVsbCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgKG5nTW9kZWwgYXMgYW55W10pLmZvckVhY2goaXRlbSA9PiBzZWxlY3QoaXRlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0KG5nTW9kZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlS2V5UHJlc3NlcygpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VhcmNoYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fa2V5UHJlc3MkXG4gICAgICAgICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5fZGVzdHJveSQpLFxuICAgICAgICAgICAgICAgIHRhcChsZXR0ZXIgPT4gdGhpcy5fcHJlc3NlZEtleXMucHVzaChsZXR0ZXIpKSxcbiAgICAgICAgICAgICAgICBkZWJvdW5jZVRpbWUoMjAwKSxcbiAgICAgICAgICAgICAgICBmaWx0ZXIoKCkgPT4gdGhpcy5fcHJlc3NlZEtleXMubGVuZ3RoID4gMCksXG4gICAgICAgICAgICAgICAgbWFwKCgpID0+IHRoaXMuX3ByZXNzZWRLZXlzLmpvaW4oJycpKSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUodGVybSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNMaXN0LmZpbmRCeUxhYmVsKHRlcm0pO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzT3Blbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3QubWFya0l0ZW0oaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zY3JvbGxUb01hcmtlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2QubWFya0ZvckNoZWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9wcmVzc2VkS2V5cyA9IFtdO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfc2V0SW5wdXRBdHRyaWJ1dGVzKCkge1xuICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXMudXNlU2VhcmNoSW5QYW5lbCA/IHRoaXMuaGVhZGVyU2VhcmNoSW5wdXQgOiB0aGlzLnNlYXJjaElucHV0O1xuXG4gICAgICAgIGlmICghaW5wdXQpIHtcbiAgICAgICAgICAgIC8vIHRyeSBhZ2FpbiBsYXRlclxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXR0cmlidXRlcyA9IHtcbiAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgIGF1dG9jb3JyZWN0OiAnb2ZmJyxcbiAgICAgICAgICAgIGF1dG9jYXBpdGFsaXplOiAnb2ZmJyxcbiAgICAgICAgICAgIGF1dG9jb21wbGV0ZTogdGhpcy5sYWJlbEZvcklkID8gJ29mZicgOiB0aGlzLmRyb3Bkb3duSWQsXG4gICAgICAgICAgICAuLi50aGlzLmlucHV0QXR0cnNcbiAgICAgICAgfTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgaW5wdXQubmF0aXZlRWxlbWVudC5zZXRBdHRyaWJ1dGUoa2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfdXBkYXRlTmdNb2RlbCgpIHtcbiAgICAgICAgY29uc3QgbW9kZWwgPSBbXTtcbiAgICAgICAgZm9yKGNvbnN0IGl0ZW0gb2YgdGhpcy5zZWxlY3RlZEl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5iaW5kVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwS2V5ID0gdGhpcy5ncm91cFZhbHVlID8gdGhpcy5iaW5kVmFsdWUgOiB0aGlzLmdyb3VwQnkgYXMgc3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZW0udmFsdWVbZ3JvdXBLZXkgfHwgdGhpcy5ncm91cEJ5IGFzIHN0cmluZ107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLml0ZW1zTGlzdC5yZXNvbHZlTmVzdGVkKGl0ZW0udmFsdWUsIHRoaXMuYmluZFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kZWwucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1vZGVsLnB1c2goaXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZWxlY3RlZCA9IHRoaXMuc2VsZWN0ZWRJdGVtcy5tYXAoeCA9PiB4LnZhbHVlKTtcbiAgICAgICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIHRoaXMuX29uQ2hhbmdlKG1vZGVsKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlRXZlbnQuZW1pdChzZWxlY3RlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9vbkNoYW5nZShpc0RlZmluZWQobW9kZWxbMF0pID8gbW9kZWxbMF0gOiBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlRXZlbnQuZW1pdChzZWxlY3RlZFswXSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jZC5tYXJrRm9yQ2hlY2soKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jbGVhclNlYXJjaCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLnNlYXJjaFRlcm0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NoYW5nZVNlYXJjaChudWxsKTtcbiAgICAgICAgdGhpcy5pdGVtc0xpc3QucmVzZXRGaWx0ZXJlZEl0ZW1zKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY2hhbmdlU2VhcmNoKHNlYXJjaFRlcm06IHN0cmluZykge1xuICAgICAgICB0aGlzLnNlYXJjaFRlcm0gPSBzZWFyY2hUZXJtO1xuICAgICAgICBpZiAodGhpcy5faXNUeXBlYWhlYWQpIHtcbiAgICAgICAgICAgIHRoaXMudHlwZWFoZWFkLm5leHQoc2VhcmNoVGVybSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9zY3JvbGxUb01hcmtlZCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT3BlbiB8fCAhdGhpcy5kcm9wZG93blBhbmVsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kcm9wZG93blBhbmVsLnNjcm9sbFRvKHRoaXMuaXRlbXNMaXN0Lm1hcmtlZEl0ZW0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3Njcm9sbFRvVGFnKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNPcGVuIHx8ICF0aGlzLmRyb3Bkb3duUGFuZWwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRyb3Bkb3duUGFuZWwuc2Nyb2xsVG9UYWcoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9vblNlbGVjdGlvbkNoYW5nZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzT3BlbiAmJiB0aGlzLm11bHRpcGxlICYmIHRoaXMuYXBwZW5kVG8pIHtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBpdGVtcyBhcmUgcmVuZGVyZWQuXG4gICAgICAgICAgICB0aGlzLl9jZC5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgICAgICAgICB0aGlzLmRyb3Bkb3duUGFuZWwuYWRqdXN0UG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZVRhYigkZXZlbnQ6IEtleWJvYXJkRXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNPcGVuID09PSBmYWxzZSAmJiAhdGhpcy5hZGRUYWcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnNlbGVjdE9uVGFiKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtc0xpc3QubWFya2VkSXRlbSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlSXRlbSh0aGlzLml0ZW1zTGlzdC5tYXJrZWRJdGVtKTtcbiAgICAgICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5zaG93QWRkVGFnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RUYWcoKTtcbiAgICAgICAgICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlRW50ZXIoJGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmlzT3BlbiB8fCB0aGlzLl9tYW51YWxPcGVuKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtc0xpc3QubWFya2VkSXRlbSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlSXRlbSh0aGlzLml0ZW1zTGlzdC5tYXJrZWRJdGVtKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5zaG93QWRkVGFnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RUYWcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wZW5PbkVudGVyKSB7XG4gICAgICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZVNwYWNlKCRldmVudDogS2V5Ym9hcmRFdmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc09wZW4gfHwgdGhpcy5fbWFudWFsT3Blbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3BlbigpO1xuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVBcnJvd0Rvd24oJGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLl9uZXh0SXRlbUlzVGFnKCsxKSkge1xuICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3QudW5tYXJrSXRlbSgpO1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsVG9UYWcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNMaXN0Lm1hcmtOZXh0SXRlbSgpO1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsVG9NYXJrZWQoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICAgICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlQXJyb3dVcCgkZXZlbnQ6IEtleWJvYXJkRXZlbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT3Blbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX25leHRJdGVtSXNUYWcoLTEpKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zTGlzdC51bm1hcmtJdGVtKCk7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxUb1RhZygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5pdGVtc0xpc3QubWFya1ByZXZpb3VzSXRlbSgpO1xuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsVG9NYXJrZWQoKTtcbiAgICAgICAgfVxuICAgICAgICAkZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9uZXh0SXRlbUlzVGFnKG5leHRTdGVwOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbmV4dEluZGV4ID0gdGhpcy5pdGVtc0xpc3QubWFya2VkSW5kZXggKyBuZXh0U3RlcDtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVGFnICYmIHRoaXMuc2VhcmNoVGVybVxuICAgICAgICAgICAgJiYgdGhpcy5pdGVtc0xpc3QubWFya2VkSXRlbVxuICAgICAgICAgICAgJiYgKG5leHRJbmRleCA8IDAgfHwgbmV4dEluZGV4ID09PSB0aGlzLml0ZW1zTGlzdC5maWx0ZXJlZEl0ZW1zLmxlbmd0aClcbiAgICB9XG5cbiAgICBwcml2YXRlIF9oYW5kbGVCYWNrc3BhY2UoKSB7XG4gICAgICAgIGlmICh0aGlzLnNlYXJjaFRlcm0gfHwgIXRoaXMuY2xlYXJhYmxlIHx8ICF0aGlzLmNsZWFyT25CYWNrc3BhY2UgfHwgIXRoaXMuaGFzVmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLm11bHRpcGxlKSB7XG4gICAgICAgICAgICB0aGlzLnVuc2VsZWN0KHRoaXMuaXRlbXNMaXN0Lmxhc3RTZWxlY3RlZEl0ZW0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jbGVhck1vZGVsKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldCBfaXNUeXBlYWhlYWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGVhaGVhZCAmJiB0aGlzLnR5cGVhaGVhZC5vYnNlcnZlcnMubGVuZ3RoID4gMDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldCBfdmFsaWRUZXJtKCkge1xuICAgICAgICBjb25zdCB0ZXJtID0gdGhpcy5zZWFyY2hUZXJtICYmIHRoaXMuc2VhcmNoVGVybS50cmltKCk7XG4gICAgICAgIHJldHVybiB0ZXJtICYmIHRlcm0ubGVuZ3RoID49IHRoaXMubWluVGVybUxlbmd0aDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9tZXJnZUdsb2JhbENvbmZpZyhjb25maWc6IE5nU2VsZWN0Q29uZmlnKSB7XG4gICAgICAgIHRoaXMucGxhY2Vob2xkZXIgPSB0aGlzLnBsYWNlaG9sZGVyIHx8IGNvbmZpZy5wbGFjZWhvbGRlcjtcbiAgICAgICAgdGhpcy5ub3RGb3VuZFRleHQgPSB0aGlzLm5vdEZvdW5kVGV4dCB8fCBjb25maWcubm90Rm91bmRUZXh0O1xuICAgICAgICB0aGlzLnR5cGVUb1NlYXJjaFRleHQgPSB0aGlzLnR5cGVUb1NlYXJjaFRleHQgfHwgY29uZmlnLnR5cGVUb1NlYXJjaFRleHQ7XG4gICAgICAgIHRoaXMuYWRkVGFnVGV4dCA9IHRoaXMuYWRkVGFnVGV4dCB8fCBjb25maWcuYWRkVGFnVGV4dDtcbiAgICAgICAgdGhpcy5sb2FkaW5nVGV4dCA9IHRoaXMubG9hZGluZ1RleHQgfHwgY29uZmlnLmxvYWRpbmdUZXh0O1xuICAgICAgICB0aGlzLmNsZWFyQWxsVGV4dCA9IHRoaXMuY2xlYXJBbGxUZXh0IHx8IGNvbmZpZy5jbGVhckFsbFRleHQ7XG4gICAgICAgIHRoaXMudmlydHVhbFNjcm9sbCA9IGlzRGVmaW5lZCh0aGlzLnZpcnR1YWxTY3JvbGwpXG4gICAgICAgICAgICA/IHRoaXMudmlydHVhbFNjcm9sbFxuICAgICAgICAgICAgOiBpc0RlZmluZWQoY29uZmlnLmRpc2FibGVWaXJ0dWFsU2Nyb2xsKSA/ICFjb25maWcuZGlzYWJsZVZpcnR1YWxTY3JvbGwgOiBmYWxzZTtcbiAgICAgICAgdGhpcy5vcGVuT25FbnRlciA9IGlzRGVmaW5lZCh0aGlzLm9wZW5PbkVudGVyKSA/IHRoaXMub3Blbk9uRW50ZXIgOiBjb25maWcub3Blbk9uRW50ZXI7XG4gICAgICAgIHRoaXMuYXBwZW5kVG8gPSB0aGlzLmFwcGVuZFRvIHx8IGNvbmZpZy5hcHBlbmRUbztcbiAgICAgICAgdGhpcy5iaW5kVmFsdWUgPSB0aGlzLmJpbmRWYWx1ZSB8fCBjb25maWcuYmluZFZhbHVlO1xuICAgICAgICB0aGlzLmJpbmRMYWJlbCA9IHRoaXMuYmluZExhYmVsIHx8IGNvbmZpZy5iaW5kTGFiZWw7XG4gICAgICAgIHRoaXMuYXBwZWFyYW5jZSA9IHRoaXMuYXBwZWFyYW5jZSB8fCBjb25maWcuYXBwZWFyYW5jZTtcbiAgICB9XG59XG4iLCI8ZGl2XG4gICAgKG1vdXNlZG93bik9XCJoYW5kbGVNb3VzZWRvd24oJGV2ZW50KVwiXG4gICAgW2NsYXNzLm5nLWFwcGVhcmFuY2Utb3V0bGluZV09XCJhcHBlYXJhbmNlID09PSAnb3V0bGluZSdcIlxuICAgIFtjbGFzcy5uZy1oYXMtdmFsdWVdPVwiaGFzVmFsdWVcIlxuICAgIFtjbGFzcy5uZy11c2Utc2VhcmNoLWlucHV0XT1cIiF1c2VTZWFyY2hJblBhbmVsXCJcbiAgICBjbGFzcz1cIm5nLXNlbGVjdC1jb250YWluZXJcIj5cblxuICAgIDxkaXYgY2xhc3M9XCJuZy12YWx1ZS1jb250YWluZXJcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5nLXBsYWNlaG9sZGVyXCI+e3twbGFjZWhvbGRlcn19PC9kaXY+XG5cbiAgICAgICAgPG5nLWNvbnRhaW5lciAqbmdJZj1cIighbXVsdGlMYWJlbFRlbXBsYXRlICB8fCAhbXVsdGlwbGUgKSAmJiBzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDBcIj5cbiAgICAgICAgICAgIDxkaXYgW2NsYXNzLm5nLXZhbHVlLWRpc2FibGVkXT1cIml0ZW0uZGlzYWJsZWRcIiBjbGFzcz1cIm5nLXZhbHVlXCIgKm5nRm9yPVwibGV0IGl0ZW0gb2Ygc2VsZWN0ZWRJdGVtczsgdHJhY2tCeTogdHJhY2tCeU9wdGlvblwiPlxuICAgICAgICAgICAgICAgIDxuZy10ZW1wbGF0ZSAjZGVmYXVsdExhYmVsVGVtcGxhdGU+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibmctdmFsdWUtaWNvbiBsZWZ0XCIgKGNsaWNrKT1cInVuc2VsZWN0KGl0ZW0pO1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPsOXPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm5nLXZhbHVlLWxhYmVsXCIgW25nSXRlbUxhYmVsXT1cIml0ZW0ubGFiZWxcIiBbZXNjYXBlXT1cImVzY2FwZUhUTUxcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgICAgICAgICAgICAgIDxuZy10ZW1wbGF0ZVxuICAgICAgICAgICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldF09XCJsYWJlbFRlbXBsYXRlIHx8IGRlZmF1bHRMYWJlbFRlbXBsYXRlXCJcbiAgICAgICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgaXRlbTogaXRlbS52YWx1ZSwgY2xlYXI6IGNsZWFySXRlbSwgbGFiZWw6IGl0ZW0ubGFiZWwgfVwiPlxuICAgICAgICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9uZy1jb250YWluZXI+XG5cbiAgICAgICAgPG5nLXRlbXBsYXRlICpuZ0lmPVwibXVsdGlwbGUgJiYgbXVsdGlMYWJlbFRlbXBsYXRlICYmIHNlbGVjdGVkVmFsdWVzLmxlbmd0aCA+IDBcIlxuICAgICAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm11bHRpTGFiZWxUZW1wbGF0ZVwiXG4gICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgaXRlbXM6IHNlbGVjdGVkVmFsdWVzLCBjbGVhcjogY2xlYXJJdGVtIH1cIj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwibmctaW5wdXRcIlxuICAgICAgICAgICAgcm9sZT1cImNvbWJvYm94XCJcbiAgICAgICAgICAgIFthdHRyLmFyaWEtZXhwYW5kZWRdPVwiaXNPcGVuXCJcbiAgICAgICAgICAgIFthdHRyLmFyaWEtb3duc109XCJpc09wZW4gPyBkcm9wZG93bklkIDogbnVsbFwiXG4gICAgICAgICAgICBhcmlhLWhhc3BvcHVwPVwibGlzdGJveFwiPlxuXG4gICAgICAgICAgICA8aW5wdXQgI3NlYXJjaElucHV0XG4gICAgICAgICAgICAgICAgICAgW2F0dHIuaWRdPVwibGFiZWxGb3JJZFwiXG4gICAgICAgICAgICAgICAgICAgW2F0dHIudGFiaW5kZXhdPVwidGFiSW5kZXhcIlxuICAgICAgICAgICAgICAgICAgIFtyZWFkT25seV09XCIhc2VhcmNoYWJsZSB8fCBpdGVtc0xpc3QubWF4SXRlbXNTZWxlY3RlZFwiXG4gICAgICAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cImRpc2FibGVkXCJcbiAgICAgICAgICAgICAgICAgICBbdmFsdWVdPVwic2VhcmNoVGVybSA/IHNlYXJjaFRlcm0gOiAnJ1wiXG4gICAgICAgICAgICAgICAgICAgKGlucHV0KT1cImZpbHRlcihzZWFyY2hJbnB1dC52YWx1ZSlcIlxuICAgICAgICAgICAgICAgICAgIChjb21wb3NpdGlvbnN0YXJ0KT1cIm9uQ29tcG9zaXRpb25TdGFydCgpXCJcbiAgICAgICAgICAgICAgICAgICAoY29tcG9zaXRpb25lbmQpPVwib25Db21wb3NpdGlvbkVuZChzZWFyY2hJbnB1dC52YWx1ZSlcIlxuICAgICAgICAgICAgICAgICAgIChmb2N1cyk9XCJvbklucHV0Rm9jdXMoJGV2ZW50KVwiXG4gICAgICAgICAgICAgICAgICAgKGJsdXIpPVwib25JbnB1dEJsdXIoJGV2ZW50KVwiXG4gICAgICAgICAgICAgICAgICAgKGNoYW5nZSk9XCIkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcIlxuICAgICAgICAgICAgICAgICAgIFthdHRyLmFyaWEtYWN0aXZlZGVzY2VuZGFudF09XCJpc09wZW4gPyBpdGVtc0xpc3Q/Lm1hcmtlZEl0ZW0/Lmh0bWxJZCA6IG51bGxcIlxuICAgICAgICAgICAgICAgICAgIGFyaWEtYXV0b2NvbXBsZXRlPVwibGlzdFwiXG4gICAgICAgICAgICAgICAgICAgW2F0dHIuYXJpYS1jb250cm9sc109XCJpc09wZW4gPyBkcm9wZG93bklkIDogbnVsbFwiPlxuICAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cblxuICAgIDxuZy1jb250YWluZXIgKm5nSWY9XCJsb2FkaW5nXCI+XG4gICAgICAgIDxuZy10ZW1wbGF0ZSAjZGVmYXVsdExvYWRpbmdTcGlubmVyVGVtcGxhdGU+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibmctc3Bpbm5lci1sb2FkZXJcIj48L2Rpdj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgICAgICA8bmctdGVtcGxhdGVcbiAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cImxvYWRpbmdTcGlubmVyVGVtcGxhdGUgfHwgZGVmYXVsdExvYWRpbmdTcGlubmVyVGVtcGxhdGVcIj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICA8L25nLWNvbnRhaW5lcj5cblxuICAgIDxzcGFuICpuZ0lmPVwic2hvd0NsZWFyKClcIiBjbGFzcz1cIm5nLWNsZWFyLXdyYXBwZXJcIiB0aXRsZT1cInt7Y2xlYXJBbGxUZXh0fX1cIj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJuZy1jbGVhclwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPsOXPC9zcGFuPlxuICAgIDwvc3Bhbj5cblxuICAgIDxzcGFuIGNsYXNzPVwibmctYXJyb3ctd3JhcHBlclwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cIm5nLWFycm93XCI+PC9zcGFuPlxuICAgIDwvc3Bhbj5cbjwvZGl2PlxuXG48bmctZHJvcGRvd24tcGFuZWwgKm5nSWY9XCJpc09wZW5cIlxuICAgICAgICAgICAgICAgICAgIGNsYXNzPVwibmctZHJvcGRvd24tcGFuZWxcIlxuICAgICAgICAgICAgICAgICAgIFt2aXJ0dWFsU2Nyb2xsXT1cInZpcnR1YWxTY3JvbGxcIlxuICAgICAgICAgICAgICAgICAgIFtidWZmZXJBbW91bnRdPVwiYnVmZmVyQW1vdW50XCJcbiAgICAgICAgICAgICAgICAgICBbYXBwZW5kVG9dPVwiYXBwZW5kVG9cIlxuICAgICAgICAgICAgICAgICAgIFtwb3NpdGlvbl09XCJkcm9wZG93blBvc2l0aW9uXCJcbiAgICAgICAgICAgICAgICAgICBbaGVhZGVyU2VhcmNoVGVtcGxhdGVdPVwidXNlU2VhcmNoSW5QYW5lbCA/IGhlYWRlclNlYXJjaFRlbXBsYXRlIDogbnVsbFwiXG4gICAgICAgICAgICAgICAgICAgW2hlYWRlclRlbXBsYXRlXT1cImhlYWRlclRlbXBsYXRlXCJcbiAgICAgICAgICAgICAgICAgICBbZm9vdGVyVGVtcGxhdGVdPVwiZm9vdGVyVGVtcGxhdGVcIlxuICAgICAgICAgICAgICAgICAgIFtmaWx0ZXJWYWx1ZV09XCJzZWFyY2hUZXJtXCJcbiAgICAgICAgICAgICAgICAgICBbaXRlbXNdPVwiaXRlbXNMaXN0LmZpbHRlcmVkSXRlbXNcIlxuICAgICAgICAgICAgICAgICAgIFttYXJrZWRJdGVtXT1cIml0ZW1zTGlzdC5tYXJrZWRJdGVtXCJcbiAgICAgICAgICAgICAgICAgICAodXBkYXRlKT1cInZpZXdQb3J0SXRlbXMgPSAkZXZlbnRcIlxuICAgICAgICAgICAgICAgICAgIChzY3JvbGwpPVwic2Nyb2xsLmVtaXQoJGV2ZW50KVwiXG4gICAgICAgICAgICAgICAgICAgKHNjcm9sbFRvRW5kKT1cInNjcm9sbFRvRW5kLmVtaXQoJGV2ZW50KVwiXG4gICAgICAgICAgICAgICAgICAgKG91dHNpZGVDbGljayk9XCJjbG9zZSgpXCJcbiAgICAgICAgICAgICAgICAgICBbY2xhc3Mubmctc2VsZWN0LW11bHRpcGxlXT1cIm11bHRpcGxlXCJcbiAgICAgICAgICAgICAgICAgICBbbmdDbGFzc109XCJhcHBlbmRUbyA/IGNsYXNzZXMgOiBudWxsXCJcbiAgICAgICAgICAgICAgICAgICBbaWRdPVwiZHJvcGRvd25JZFwiXG4gICAgICAgICAgICAgICAgICAgcm9sZT1cImxpc3Rib3hcIlxuICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9XCJPcHRpb25zIGxpc3RcIj5cblxuICAgIDxuZy10ZW1wbGF0ZSAjaGVhZGVyU2VhcmNoVGVtcGxhdGU+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuZy1zZWxlY3QtZHJvcGRvd24tc2VhcmNoIG0tblwiPlxuICAgICAgICAgICAgPGlucHV0ICNoZWFkZXJTZWFyY2hJbnB1dFxuICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiZm9ybS1jb250cm9sIHNlYXJjaC1pbnB1dFwiXG4gICAgICAgICAgICAgICAgICAgW2F0dHIuaWRdPVwibGFiZWxGb3JJZFwiXG4gICAgICAgICAgICAgICAgICAgW2F0dHIudGFiaW5kZXhdPVwidGFiSW5kZXhcIlxuICAgICAgICAgICAgICAgICAgIFtyZWFkT25seV09XCIhc2VhcmNoYWJsZSB8fCBpdGVtc0xpc3QubWF4SXRlbXNTZWxlY3RlZFwiXG4gICAgICAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cImRpc2FibGVkXCJcbiAgICAgICAgICAgICAgICAgICBbdmFsdWVdPVwic2VhcmNoVGVybSA/IHNlYXJjaFRlcm0gOiAnJ1wiXG4gICAgICAgICAgICAgICAgICAgKGlucHV0KT1cImZpbHRlcihoZWFkZXJTZWFyY2hJbnB1dC52YWx1ZSlcIlxuICAgICAgICAgICAgICAgICAgIChjb21wb3NpdGlvbnN0YXJ0KT1cIm9uQ29tcG9zaXRpb25TdGFydCgpXCJcbiAgICAgICAgICAgICAgICAgICAoY29tcG9zaXRpb25lbmQpPVwib25Db21wb3NpdGlvbkVuZChoZWFkZXJTZWFyY2hJbnB1dC52YWx1ZSlcIlxuICAgICAgICAgICAgICAgICAgIChmb2N1cyk9XCJvbklucHV0Rm9jdXMoJGV2ZW50KVwiXG4gICAgICAgICAgICAgICAgICAgKGJsdXIpPVwib25JbnB1dEJsdXIoJGV2ZW50KVwiXG4gICAgICAgICAgICAgICAgICAgKGNoYW5nZSk9XCIkZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcIlxuICAgICAgICAgICAgICAgICAgIFthdHRyLmFyaWEtYWN0aXZlZGVzY2VuZGFudF09XCJpc09wZW4gPyBpdGVtc0xpc3Q/Lm1hcmtlZEl0ZW0/Lmh0bWxJZCA6IG51bGxcIlxuICAgICAgICAgICAgICAgICAgIGFyaWEtYXV0b2NvbXBsZXRlPVwibGlzdFwiXG4gICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJTZWFyY2hcIlxuICAgICAgICAgICAgICAgICAgIFthdHRyLmFyaWEtY29udHJvbHNdPVwiaXNPcGVuID8gZHJvcGRvd25JZCA6IG51bGxcIj5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgIDxuZy1jb250YWluZXI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuZy1vcHRpb25cIiBbYXR0ci5yb2xlXT1cIml0ZW0uY2hpbGRyZW4gPyAnZ3JvdXAnIDogJ29wdGlvbidcIiAoY2xpY2spPVwidG9nZ2xlSXRlbShpdGVtKVwiIChtb3VzZW92ZXIpPVwib25JdGVtSG92ZXIoaXRlbSlcIlxuICAgICAgICAgICAgICAgICpuZ0Zvcj1cImxldCBpdGVtIG9mIHZpZXdQb3J0SXRlbXM7IHRyYWNrQnk6IHRyYWNrQnlPcHRpb25cIlxuICAgICAgICAgICAgICAgIFtjbGFzcy5uZy1vcHRpb24tZGlzYWJsZWRdPVwiaXRlbS5kaXNhYmxlZFwiXG4gICAgICAgICAgICAgICAgW2NsYXNzLm5nLW9wdGlvbi1zZWxlY3RlZF09XCJpdGVtLnNlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICBbY2xhc3Mubmctb3B0Z3JvdXBdPVwiaXRlbS5jaGlsZHJlblwiXG4gICAgICAgICAgICAgICAgW2NsYXNzLm5nLW9wdGlvbl09XCIhaXRlbS5jaGlsZHJlblwiXG4gICAgICAgICAgICAgICAgW2NsYXNzLm5nLW9wdGlvbi1jaGlsZF09XCIhIWl0ZW0ucGFyZW50XCJcbiAgICAgICAgICAgICAgICBbY2xhc3Mubmctb3B0aW9uLW1hcmtlZF09XCJpdGVtID09PSBpdGVtc0xpc3QubWFya2VkSXRlbVwiXG4gICAgICAgICAgICAgICAgW2F0dHIuYXJpYS1zZWxlY3RlZF09XCJpdGVtLnNlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICBbYXR0ci5pZF09XCJpdGVtPy5odG1sSWRcIj5cblxuICAgICAgICAgICAgPG5nLXRlbXBsYXRlICNkZWZhdWx0T3B0aW9uVGVtcGxhdGU+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJuZy1vcHRpb24tbGFiZWxcIiBbbmdJdGVtTGFiZWxdPVwiaXRlbS5sYWJlbFwiIFtlc2NhcGVdPVwiZXNjYXBlSFRNTFwiPjwvc3Bhbj5cbiAgICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG5cbiAgICAgICAgICAgIDxuZy10ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIml0ZW0uY2hpbGRyZW4gPyAob3B0Z3JvdXBUZW1wbGF0ZSB8fCBkZWZhdWx0T3B0aW9uVGVtcGxhdGUpIDogKG9wdGlvblRlbXBsYXRlIHx8IGRlZmF1bHRPcHRpb25UZW1wbGF0ZSlcIlxuICAgICAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7IGl0ZW06IGl0ZW0udmFsdWUsIGl0ZW0kOml0ZW0sIGluZGV4OiBpdGVtLmluZGV4LCBzZWFyY2hUZXJtOiBzZWFyY2hUZXJtIH1cIj5cbiAgICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuZy1vcHRpb25cIiBbY2xhc3Mubmctb3B0aW9uLW1hcmtlZF09XCIhaXRlbXNMaXN0Lm1hcmtlZEl0ZW1cIiAobW91c2VvdmVyKT1cIml0ZW1zTGlzdC51bm1hcmtJdGVtKClcIiByb2xlPVwib3B0aW9uXCIgKGNsaWNrKT1cInNlbGVjdFRhZygpXCIgKm5nSWY9XCJzaG93QWRkVGFnXCI+XG4gICAgICAgICAgICA8bmctdGVtcGxhdGUgI2RlZmF1bHRUYWdUZW1wbGF0ZT5cbiAgICAgICAgICAgICAgICA8c3Bhbj48c3BhbiBjbGFzcz1cIm5nLXRhZy1sYWJlbFwiPnt7YWRkVGFnVGV4dH19PC9zcGFuPlwie3tzZWFyY2hUZXJtfX1cIjwvc3Bhbj5cbiAgICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG5cbiAgICAgICAgICAgIDxuZy10ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cInRhZ1RlbXBsYXRlIHx8IGRlZmF1bHRUYWdUZW1wbGF0ZVwiXG4gICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgc2VhcmNoVGVybTogc2VhcmNoVGVybSB9XCI+XG4gICAgICAgICAgICA8L25nLXRlbXBsYXRlPlxuICAgICAgICA8L2Rpdj5cbiAgICA8L25nLWNvbnRhaW5lcj5cblxuICAgIDxuZy1jb250YWluZXIgKm5nSWY9XCJzaG93Tm9JdGVtc0ZvdW5kKClcIj5cbiAgICAgICAgPG5nLXRlbXBsYXRlICNkZWZhdWx0Tm90Rm91bmRUZW1wbGF0ZT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuZy1vcHRpb24gbmctb3B0aW9uLWRpc2FibGVkXCI+e3tub3RGb3VuZFRleHR9fTwvZGl2PlxuICAgICAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgICAgIDxuZy10ZW1wbGF0ZVxuICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwibm90Rm91bmRUZW1wbGF0ZSB8fCBkZWZhdWx0Tm90Rm91bmRUZW1wbGF0ZVwiXG4gICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyBzZWFyY2hUZXJtOiBzZWFyY2hUZXJtIH1cIj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICA8L25nLWNvbnRhaW5lcj5cblxuICAgIDxuZy1jb250YWluZXIgKm5nSWY9XCJzaG93VHlwZVRvU2VhcmNoKClcIj5cbiAgICAgICAgPG5nLXRlbXBsYXRlICNkZWZhdWx0VHlwZVRvU2VhcmNoVGVtcGxhdGU+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibmctb3B0aW9uIG5nLW9wdGlvbi1kaXNhYmxlZFwiPnt7dHlwZVRvU2VhcmNoVGV4dH19PC9kaXY+XG4gICAgICAgIDwvbmctdGVtcGxhdGU+XG5cbiAgICAgICAgPG5nLXRlbXBsYXRlXG4gICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldF09XCJ0eXBlVG9TZWFyY2hUZW1wbGF0ZSB8fCBkZWZhdWx0VHlwZVRvU2VhcmNoVGVtcGxhdGVcIj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICA8L25nLWNvbnRhaW5lcj5cblxuICAgIDxuZy1jb250YWluZXIgKm5nSWY9XCJsb2FkaW5nICYmIGl0ZW1zTGlzdC5maWx0ZXJlZEl0ZW1zLmxlbmd0aCA9PT0gMFwiPlxuICAgICAgICA8bmctdGVtcGxhdGUgI2RlZmF1bHRMb2FkaW5nVGV4dFRlbXBsYXRlPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5nLW9wdGlvbiBuZy1vcHRpb24tZGlzYWJsZWRcIj57e2xvYWRpbmdUZXh0fX08L2Rpdj5cbiAgICAgICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgICAgICA8bmctdGVtcGxhdGVcbiAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cImxvYWRpbmdUZXh0VGVtcGxhdGUgfHwgZGVmYXVsdExvYWRpbmdUZXh0VGVtcGxhdGVcIlxuICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgc2VhcmNoVGVybTogc2VhcmNoVGVybSB9XCI+XG4gICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgPC9uZy1jb250YWluZXI+XG5cbjwvbmctZHJvcGRvd24tcGFuZWw+XG4iXX0=
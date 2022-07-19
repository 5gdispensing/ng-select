import { NgSelectComponent } from './ng-select.component';
import { NgOption } from './ng-select.types';
import { SelectionModel } from './selection-model';
export declare class ItemsList {
    private _ngSelect;
    private _selectionModel;
    private _groups;
    constructor(_ngSelect: NgSelectComponent, _selectionModel: SelectionModel);
    private _items;
    get items(): NgOption[];
    private _filteredItems;
    get filteredItems(): NgOption[];
    private _markedIndex;
    get markedIndex(): number;
    get selectedItems(): NgOption[];
    get markedItem(): NgOption;
    get noItemsToSelect(): boolean;
    get maxItemsSelected(): boolean;
    get firstSelectedItem(): NgOption;
    get lastSelectedItem(): NgOption;
    setItems(items: any[]): void;
    select(item: NgOption): void;
    unselect(item: NgOption): void;
    findItem(value: any): NgOption;
    addItem(item: any): NgOption;
    clearSelected(keepDisabled?: boolean): void;
    findByLabel(term: string): NgOption;
    /**
     * Filter item list using search function.
     *
     * @param term - keyword to use in searching.
     * @param [params] - custom params to pass to search function
     */
    filter(term: string, params?: any): void;
    resetFilteredItems(): void;
    unmarkItem(): void;
    markNextItem(): void;
    markPreviousItem(): void;
    markItem(item: NgOption): void;
    markSelectedOrDefault(markDefault?: boolean): void;
    resolveNested(option: any, key: string): any;
    mapItem(item: any, index: number): NgOption;
    mapSelectedItems(): void;
    private _showSelected;
    private _hideSelected;
    private _defaultSearchFn;
    private _getNextItemIndex;
    private _stepToItem;
    private _getFirstMarkedIndex;
    private _getLastMarkedIndex;
    private _groupBy;
    private _flatten;
}

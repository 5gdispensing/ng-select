import { Directive, Input } from '@angular/core';
import * as i0 from "@angular/core";
export class NgOptionHighlightDirective {
    constructor(elementRef, renderer) {
        this.elementRef = elementRef;
        this.renderer = renderer;
        this.element = this.elementRef.nativeElement;
    }
    ngOnChanges() {
        if (this._canHighlight) {
            this._highlightLabel();
        }
    }
    ngAfterViewInit() {
        this.label = this.element.innerHTML;
        if (this._canHighlight) {
            this._highlightLabel();
        }
    }
    _escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    _highlightLabel() {
        const label = this.label;
        if (!this.term) {
            this._setInnerHtml(label);
            return;
        }
        const alternationString = this._escapeRegExp(this.term).replace(' ', '|');
        const termRegex = new RegExp(alternationString, 'gi');
        this._setInnerHtml(label.replace(termRegex, `<span class=\"highlighted\">$&</span>`));
    }
    get _canHighlight() {
        return this._isDefined(this.term) && this._isDefined(this.label);
    }
    _setInnerHtml(html) {
        this.renderer.setProperty(this.elementRef.nativeElement, 'innerHTML', html);
    }
    _isDefined(value) {
        return value !== undefined && value !== null;
    }
}
NgOptionHighlightDirective.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0", ngImport: i0, type: NgOptionHighlightDirective, deps: [{ token: i0.ElementRef }, { token: i0.Renderer2 }], target: i0.ɵɵFactoryTarget.Directive });
NgOptionHighlightDirective.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "14.0.0", type: NgOptionHighlightDirective, selector: "[ngOptionHighlight]", inputs: { term: ["ngOptionHighlight", "term"] }, usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0", ngImport: i0, type: NgOptionHighlightDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[ngOptionHighlight]'
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i0.Renderer2 }]; }, propDecorators: { term: [{
                type: Input,
                args: ['ngOptionHighlight']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctb3B0aW9uLWhpZ2hsaWdodC5kaXJlY3RpdmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbmctb3B0aW9uLWhpZ2hsaWdodC9saWIvbmctb3B0aW9uLWhpZ2hsaWdodC5kaXJlY3RpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUVILFNBQVMsRUFFVCxLQUFLLEVBR1IsTUFBTSxlQUFlLENBQUM7O0FBS3ZCLE1BQU0sT0FBTywwQkFBMEI7SUFPbkMsWUFDWSxVQUFzQixFQUN0QixRQUFtQjtRQURuQixlQUFVLEdBQVYsVUFBVSxDQUFZO1FBQ3RCLGFBQVEsR0FBUixRQUFRLENBQVc7UUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztJQUNqRCxDQUFDO0lBRUQsV0FBVztRQUNQLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUNwQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7U0FDMUI7SUFDTCxDQUFDO0lBRUQsZUFBZTtRQUNYLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDcEMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztTQUMxQjtJQUNMLENBQUM7SUFFTyxhQUFhLENBQUMsR0FBVztRQUM3QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVPLGVBQWU7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNaLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsT0FBTztTQUNWO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sU0FBUyxHQUFHLElBQUksTUFBTSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUNBQXVDLENBQUMsQ0FBQyxDQUFBO0lBQ3pGLENBQUM7SUFFRCxJQUFZLGFBQWE7UUFDckIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRU8sYUFBYSxDQUFDLElBQUk7UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFTyxVQUFVLENBQUMsS0FBVTtRQUN6QixPQUFPLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQztJQUNqRCxDQUFDOzt1SEFwRFEsMEJBQTBCOzJHQUExQiwwQkFBMEI7MkZBQTFCLDBCQUEwQjtrQkFIdEMsU0FBUzttQkFBQztvQkFDUCxRQUFRLEVBQUUscUJBQXFCO2lCQUNsQzt5SEFHK0IsSUFBSTtzQkFBL0IsS0FBSzt1QkFBQyxtQkFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBzZWFyY2hIZWxwZXIgZnJvbSAnLi9zZWFyY2gtaGVscGVyJztcbmltcG9ydCB7XG4gICAgQWZ0ZXJWaWV3SW5pdCxcbiAgICBEaXJlY3RpdmUsXG4gICAgRWxlbWVudFJlZixcbiAgICBJbnB1dCxcbiAgICBPbkNoYW5nZXMsXG4gICAgUmVuZGVyZXIyXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5ARGlyZWN0aXZlKHtcbiAgICBzZWxlY3RvcjogJ1tuZ09wdGlvbkhpZ2hsaWdodF0nXG59KVxuZXhwb3J0IGNsYXNzIE5nT3B0aW9uSGlnaGxpZ2h0RGlyZWN0aXZlIGltcGxlbWVudHMgT25DaGFuZ2VzLCBBZnRlclZpZXdJbml0IHtcblxuICAgIEBJbnB1dCgnbmdPcHRpb25IaWdobGlnaHQnKSB0ZXJtOiBzdHJpbmc7XG5cbiAgICBwcml2YXRlIGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgbGFiZWw6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwcml2YXRlIGVsZW1lbnRSZWY6IEVsZW1lbnRSZWYsXG4gICAgICAgIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMikge1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSB0aGlzLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcbiAgICB9XG5cbiAgICBuZ09uQ2hhbmdlcygpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NhbkhpZ2hsaWdodCkge1xuICAgICAgICAgICAgdGhpcy5faGlnaGxpZ2h0TGFiZWwoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICAgICAgdGhpcy5sYWJlbCA9IHRoaXMuZWxlbWVudC5pbm5lckhUTUw7XG4gICAgICAgIGlmICh0aGlzLl9jYW5IaWdobGlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuX2hpZ2hsaWdodExhYmVsKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9lc2NhcGVSZWdFeHAoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGlnaGxpZ2h0TGFiZWwoKSB7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gdGhpcy5sYWJlbDtcbiAgICAgICAgaWYgKCF0aGlzLnRlcm0pIHtcbiAgICAgICAgICAgIHRoaXMuX3NldElubmVySHRtbChsYWJlbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhbHRlcm5hdGlvblN0cmluZyA9IHRoaXMuX2VzY2FwZVJlZ0V4cCh0aGlzLnRlcm0pLnJlcGxhY2UoJyAnLCAnfCcpO1xuICAgICAgICBjb25zdCB0ZXJtUmVnZXggPSBuZXcgUmVnRXhwKGFsdGVybmF0aW9uU3RyaW5nLCAnZ2knKTtcbiAgICAgICAgdGhpcy5fc2V0SW5uZXJIdG1sKGxhYmVsLnJlcGxhY2UodGVybVJlZ2V4LCBgPHNwYW4gY2xhc3M9XFxcImhpZ2hsaWdodGVkXFxcIj4kJjwvc3Bhbj5gKSlcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldCBfY2FuSGlnaGxpZ2h0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNEZWZpbmVkKHRoaXMudGVybSkgJiYgdGhpcy5faXNEZWZpbmVkKHRoaXMubGFiZWwpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3NldElubmVySHRtbChodG1sKSB7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UHJvcGVydHkodGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQsICdpbm5lckhUTUwnLCBodG1sKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9pc0RlZmluZWQodmFsdWU6IGFueSkge1xuICAgICAgICByZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbDtcbiAgICB9XG59XG4iXX0=
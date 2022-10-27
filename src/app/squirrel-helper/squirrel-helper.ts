import { Directive, HostListener } from "@angular/core";
import { environment } from "src/environments/environment";
declare var w3color: any;

@Directive()
export class SquirrelHelper {
    debug = environment.debug;

    testMessage = 'Move along.';
    private ifid = 'Nothing to see here.'

    private _size: SquirrelSize;
    private _position: SquirrelPosition;
    private _runtimeMode: string;
    private _canvas: SquirrelCanvas;
    private _state: any;
    private _bindingDimensions: any;
    constructor() { }

    /**
     * sets up the event listener to receive messages from the parent
     * @param event message incoming from parent
     */
    @HostListener('window:message', ['$event'])
    onMessage(event: any): void {
        this.messageHandler(event);
    }

    /**
   * get the value for a URL query string parameter
   * 
   * @param name the name of the URL query parameter to get the value for
   * @returns the value of the query parameter
   */
    private getParameterByName(name: string): string {
        const url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) { return ''; }
        if (!results[2]) { return ''; }
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    /**
     * Called if an unexpected message is received from Squirrel
     * @param message the whole message body received
     */
    private catchAllMessageReceived(message: SquirrelMessage): void {
        if (this.debug) {
            console.log('CHILD - unknown message received', message);
        }
    }

    /**
     * Method used to update the widgets local copy of state using a property string
     * @param property property string to check
     * @param data value to check for changes
     * @returns updates the local state for the property and return bool as to whether it found and updated the value
     */
    private updatePropertyState(property: string, data: any): boolean {
        const propertyArray = property.split('.');
        let subState = this._state;
        propertyArray.forEach((value, index) => {
            if (subState && index < propertyArray.length - 1) {
                subState = subState[value];
            }
        });
        if (subState) {
            const subProperty = propertyArray[propertyArray.length - 1];
            subState[subProperty] = data;
            return true;
        }
        return false;
    }

    /**
     * Called when an incoming postMessage is received from Squirrel
     * 
     * @param event incoming message object
     */
    private messageHandler(event: any): void {
        if (event.data.id == this.ifid) {
            const message = <SquirrelMessage>event.data;

            switch (message.name) {
                case 'setSize':
                    // call size changes method
                    this._size = <SquirrelSize>message.value;
                    this.onSetSize(this._size);
                    break;
                case 'setPosition':
                    // call position changes method
                    this._position = <SquirrelPosition>message.value;
                    this.onSetPosition(this._position);
                    break;
                case 'setRuntimeMode':
                    // call runtimeMode changes method
                    this._runtimeMode = message.value;
                    this.onSetRuntimeMode(this._runtimeMode);
                    break;
                case 'setCanvas':
                    // call size changes method
                    this._canvas = <SquirrelCanvas>message.value;
                    this.onSetCanvas(this._canvas);
                    break;
                case 'initState':
                    // send copy of whole dymanic state, binding dimensions and size details
                    // value = {dynamicState: any, bindingDimensions: any, size: SquirrelSize}
                    this._state = message.value.dynamicState ?? {};
                    this._size = <SquirrelSize>message.value.size;
                    this._position = <SquirrelPosition>message.value.position;
                    this._bindingDimensions = message.value.bindingDimensions ?? {};
                    this._runtimeMode = message.value.runtimeMode;
                    this._canvas = message.value.canvas;
                    this.onInitState(this.getCopyOfState());
                    break;
                case 'propertyChange':
                    // called once for each property that has changed
                    // message.value = {'property':'blaa.color.0.color', 'value': '#12345', dimension: {"width":1,"height":1}}

                    // if it has a dimension property then we need to update our binding dimension for the property
                    if (message.value.hasOwnProperty('dimension') && this._bindingDimensions != null) {
                        this._bindingDimensions[message.value.propery] = message.value.dimension;
                    }

                    // handle processing and updating state for these specific properties
                    if (this.updatePropertyState(message.value.property, message.value.value)) {
                        this.onPropertyChange(message.value.property, message.value.value);
                    }
                    break;
                case 'propertyChangesComplete':
                    // called at the end of the latest batch of 1 or more propertyChange events
                    this.onPropertyChangesComplete();
                    break;
                default:
                    this.catchAllMessageReceived(message);
                    break;
            }
        }
    }

    /**
     * Initialises the add-on and posts the DOMREADY message to the parent.
     * @param spoofResponse default false, if true will not send DOMREADY to Squirrel, instea will simulate a response back.  Useful when developing
     */
    protected initWithSquirrel(): void {
        if (this.debug) {
            console.log('CHILD - Add-on initialised');
            console.log('CHILD - DOMREADY');
        }
        // set the internal IFID tag
        this.ifid = this.getParameterByName('ifid');

        // send DOMREADY to Squirrel
        if (this.ifid != null && this.ifid !== '') {
            parent.postMessage({ 'id': this.ifid, 'message': 'DOMREADY' }, '*');
        }
    }

    /**
     * Used to send data to the parent.
     * 
     * Single value is a string
     * Multi value is a multi-dimensional array  eg 2 x 2 = [["Row 1 Column 1", "Row 1 Column 2"],["Row 2 Column 1", "Row 2 Column 2"]
     * 
     * @param property the property to update in state  eg buttonColor.colour.0.color
     * @param value the value or multi-dimension array of data to send to parent
     * @param padData If true, the data sent to Squirrel will match the dimensions of the binding range.  Padding with nulls if necessary
     */
    protected sendToSquirrel(property: string, value: any, padData = true): void {
        // check to see if the value is different, if not do not send message
        let data = value;
        if (padData) {
            const dim = this.getBindingDimension(property);
            // TODO need to validate string for arrays 
            if (dim != null) {
                data = this.convertToSquirrelArrayOfSize(value, dim.width, dim.height)
            } else {
                console.log(`CHILD - Warning, ${property} binding not found`);
            }
        }
        if (this.updatePropertyState(property, data)) {
            const message = new SquirrelMessage(this.ifid, property, data);
            if (this.debug) { console.log('CHILD - sending message to parent', message) }
            parent.postMessage(message, '*');
        } else {
            if (this.debug) { console.log('CHILD - message not sent as value the same', property, data) }
        }
    }

    /**
     * Apply a 30% tint to a colour. 
     * @param color The colour to apply the tint to
     * @param alpha The opacity of the colour
     * @returns an RGBA string of the new colour
     */
    protected tintColor(color: any, alpha = 1): string {
        const defaultColor = '#000000';
        const newAlpha = this.checkDecimal(alpha);
        const newColor = (typeof color === 'string') ? color : defaultColor;
        const w3c = w3color(newColor, null);
        w3c.opacity = newAlpha;
        w3c.lighter(30);
        return w3c.toRgbaString();
    }

    /**
     * Apply a 30% shade to a colour. 
     * @param color The colour to apply the shade to
     * @param alpha The opacity of the colour
     * @returns an RGBA string of the new colour
     */
    protected shadeColor(color: any, alpha = 1): string {
        const defaultColor = '#000000';
        const newAlpha = this.checkDecimal(alpha);
        const newColor = (typeof color === 'string') ? color : defaultColor;
        const w3c = w3color(newColor, null);
        w3c.opacity = newAlpha;
        w3c.darker(30);
        return w3c.toRgbaString();
    }

    /**
     * Used to convert percentages to decimals.  eg 50% to 0.5
     * @param value the number to check
     * @returns the decimal value
     */
    protected checkDecimal(value: any): number {
        return (value > 1) ? value / 100 : value;
    }

    /**
     * Pads out the array to match the dimensions of the last array passed to Squirrel.
     * @param data Json Array in
     * @param width Min size to pad the array upto
     * @param height Min size to pad the array upto
     * @returns array matching the dimensions of the last array passed to Squirrel
     */
    protected convertToSquirrelArrayOfSize(data: any[], width: number, height: number): any[] {
        //expands the theArray with null entries to become newRows x newCols in sizes

        // check to see if data is an array
        // if not then check to see what the binding dimension is
        // if 1 x 1 then return the string back as the binding will be for a single value
        // if not 1 x 1 then convert data to array to build up correct multi-dim array structure
        if (!Array.isArray(data)) {
            if (width === 1 && height === 1) {
                return data;
            } else {
                data = [[data]];
            }
        }

        // if dimensions are 1 x 1 then make sure it's a primitive value
        if (width === 1 && height === 1 && Array.isArray(data)) {
            // flatten multi dimensional array into a single array, and get first element for the first cell
            return data.flat(Infinity)[0];
        }

        let newWidth = 0;
        for (var row = 0; row < data.length; row++) {
            // loop through each row
            if ((width - data[row].length) > 0) {
                // if number of columns is fewer than requested width add more columns on
                data[row] = data[row].concat([...Array(width - data[row].length)]);
            } else if (data[row].length - width > 0) {
                // if the number of columns is greate than requested,  remove the redundant columns
                data[row].splice(-(data[row].length - width));
            }
            newWidth = data[row].length;
        }

        // check to see if the number of rows matches the requested height
        if (data.length < height) {
            // add rows if too few
            for (var i = data.length; i < height; i++) {
                data[i] = [...Array(newWidth)]
            }
        } else if (data.length > height) {
            //remove rows if too many.
            data.splice(height - data.length)
        }

        return data;
    }

    /**
     * Get a readonly copy of state
     * @returns the clone of state
     */
    protected getCopyOfState(): any {
        return JSON.parse(JSON.stringify(this._state));
    }

    /**
     * Get the current size of the component in Squirrel
     * @returns SquirrelSize object
     */
    protected getSize(): SquirrelSize {
        return this._size;
    }

    /**
     * Get the current position of the component on the Squirrel canvas
     * @returns SquirrelPosition object
     * Added in build 1.12.x
     */
    protected getPosition(): SquirrelPosition {
        return this._position;
    }

    /**
     * Get the current runtime mode of the component on the Squirrel canvas
     * @returns string
     * Added in build 1.12.x
     */
     protected getRuntimeMode(): string {
        return this._runtimeMode;
    }

    /**
     * Get the current size and color of the Squirrel canvas
     * @returns SquirrelCanvas object
     * Added in build 1.12.x
     */
     protected getCanvas(): SquirrelCanvas {
        return this._canvas;
    }

    /**
     * Sets the size of the component in Squirrel
     * @param size type SquirrelSize 
     * Added in build 1.12.x
     */
    protected setSize(size: SquirrelSize): void {
        const message = new SquirrelMessage(this.ifid, 'size', size);
        if (this.debug) { console.log('CHILD - sending rezise message to parent', size) }
        parent.postMessage(message, '*');
    }

    /**
     * Sets the position of the component on the Squirrel canvas
     * @param position type SquirrelSize 
     * Added in build 1.12.x
     */
    protected setPosition(position: SquirrelPosition): void {
        const message = new SquirrelMessage(this.ifid, 'position', position);
        if (this.debug) { console.log('CHILD - sending position message to parent', position) }
        parent.postMessage(message, '*');
    }

    /**
     * Returns the width and height of the Squirrel bindings for a selected property
     * @param property the dot notation reference for the property e.g. buttonColor.color.0.color
     * @returns the height and width of the binding
     */
    protected getBindingDimension(property: string): SquirrelSize {
        return <SquirrelSize>this._bindingDimensions[property];
    }

    /**
     * Used to turn a property with array positions into a generic property name for doing check against
     * @param property dot notation property to convert   eg series.0.enabled
     * @returns property with indexes changed to *   eg series.*.series
     */
    protected getGenericProperty(property: string): string {
        let propertyArray = property.split('.');
        propertyArray = propertyArray.map((value: any) => {
            if (!isNaN(value)) {
                value = '*';
            }
            return value;
        });
        return propertyArray.join('.');
    }

    /**
     * Overridable
     * Called when a setPosition event is received from Squirrel
     * @param position the position object passed in from the message handler
     * Added in build 1.12.x
     */
    onSetPosition(position: SquirrelPosition): void {
        if (this.debug) {
            console.log('CHILD - setPosition message received', position);
            console.warn('CHILD - don\'t forget to override to process incoming messages');
        }
    }

    /**
     * Overridable
     * Called when a setSize event is received from Squirrel
     * @param size the size object passed in from the message handler
     */
    onSetSize(size: SquirrelSize): void {
        if (this.debug) {
            console.log('CHILD - setSize message received', size);
            console.warn('CHILD - don\'t forget to override to process incoming messages');
        }
    }

    /**
     * Overridable
     * Called when a setRuntimeMode event is received from Squirrel
     * @param mode the mode string passed in from the message handler
     * Added in build 1.12.x
     */
    onSetRuntimeMode(mode: string): void {
        if (this.debug) {
            console.log('CHILD - setRuntimeMode message received', mode);
            console.warn('CHILD - don\'t forget to override to process incoming messages');
        }
    }

    /**
     * Overridable
     * Called when a setCanvas event is received from Squirrel
     * @param canvas the canvas structure passed in from the message handler
     * Added in build 1.12.x
     */
    onSetCanvas(canvas: SquirrelCanvas): void {
        if (this.debug) {
            console.log('CHILD - setCanvas message received', canvas);
            console.warn('CHILD - don\'t forget to override to process incoming messages');
        }
    }

    /**
     * Overridable
     * Called when an initState event is recevied from Squirrel.
     * @param state a copy of the whole of the addon's state
     */
    onInitState(state: any): void {
        if (this.debug) {
            console.log('CHILD - onInitState message received', state);
            console.warn('CHILD - don\'t forget to override to process incoming messages');
        }
    }

    /**
     * Overridable
     * Called when a property change event is recevied from Squirrel.
     * @param property the property name which changed
     * @param value the value the property changed to
     */
    onPropertyChange(property: string, value: any): void {
        if (this.debug) {
            console.log('CHILD - onPropertyChange message received', property, value);
            console.warn('CHILD - don\'t forget to override to process incoming messages');
        }
    }

    /**
     * Overridable
     * Called at the end of a series of property value changes.  This can be called
     * either when a single or multiple values change at once.  This is the flag to say
     * There are no more incoming value changs to process at this time.
     */
    onPropertyChangesComplete(): void {
        if (this.debug) {
            console.log('CHILD - propertyChangesComplete message received');
            console.warn('CHILD - don\'t forget to override to process incoming messages');
        }
    }

}


export class SquirrelMessage {
    name: string;
    id?: string;
    value: any;

    constructor(id: string | null, name: string | null, value: string | null | any[] | SquirrelSize | SquirrelPosition) {
        if (id != null) { this.id = id; }
        if (name != null) { this.name = name; }
        if (value != null) { this.value = value; }
    }
}

export class SquirrelSize {
    height: number;
    width: number;

    constructor(width: number, height: number) {
        if (width != null) { this.width = width; }
        if (height != null) { this.height = height; }
    }
}

export class SquirrelPosition {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        if (x != null) { this.x = x; }
        if (y != null) { this.y = y; }
    }
}

export class SquirrelColor {
    color: string;
    alpha: number;

    constructor(color: string, alpha: number) {
        if (color != null) { this.color = color; }
        if (alpha != null) { this.alpha = alpha; }
    }
}

export class SquirrelCanvas {
    size: SquirrelSize;
    color: SquirrelColor;

    constructor(size: SquirrelSize, color: SquirrelColor) {
        if (size != null) { this.size = size; }
        if (color != null) { this.color = color; }
    }
}

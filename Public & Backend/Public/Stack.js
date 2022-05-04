// Filename: public/Stack.js 
//
// Code written in public files is shared by your site's
// Backend, page code, and site code environments.
//
// Use public files to hold utility functions that can 
// be called from multiple locations in your site's code.

export const STACK_KEY = "stackKey"; // The key for the Session dictionary to retrieve and store the page stack.

export const STACK_LIMIT = 100; // The maximum number of pages we will save (note: must have size less than 50 KB).

// In order for the back button to function correctly, we need to create a page stack.
export class Stack{
    // Array is used to implement stack
    constructor(limit)
    {
        this.items = [];
        this.limit = limit;
    }

    // Loads the stack from a csvString. The items will fill the stack in the order presented by the string.
    loadFromString(csvString) {
        if (csvString && csvString != "undefined")
            this.items = csvString.split(',');
    }
  
    // Pushes an item onto the top of the stack. Removes an item from the bottom of the stack if the length exceeds the limit.
    push(item) {
        while (this.items.length >= this.limit)
            this.items.shift();
        this.items.push(item);
    }

    // Pulls an item off the top of the stack. If the stack is empty, returns null.
    pop() {
        if (this.items.length == 0)
            return null;
        return this.items.pop();
    }

    // Returns the item off the top of the stack without removing the item from the stack. If the stack is empty, returns null.
    peek() {
        if (this.items.length == 0)
            return null;
        return this.items[this.items.length - 1];
    }

    // Returns a boolean that is true if the stack is empty
    isEmpty() {
        return (this.items.length == 0);
    }

    // Returns a single comma-separated value string containing all the items in the stack.
    printStack() {
        var str = "";
        for (var i = 0; i < this.items.length - 1; i++)
            str += this.items[i] + ",";
        // The final item should not have a comma after it.
        str += this.items[i]; 
        return str;
    }

    // Returns the size of the stack.
    size() {
        return this.items.length;
    }
}
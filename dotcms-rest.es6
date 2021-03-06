/**
 * @author Jared Flack <jared@ethode.com>
 * @date March 11, 2015
 */
class DotcmsRest {

    constructor(config) {
        this.debug = config.debug || false;
        this.config = config;
        this.idCounter = 0;
        this.identifierLock = [];
    }

    /**
     * Creates a new contentlent.
     * @param  string   method    save|publish
     * @param  string   structure The structure the contentlet belongs to.
     * @param  object   data      The contentlet's parameters.
     * @param  function callback  The function that will be called when the
     * transaction has completed.
     * @param boolean
     */
    createContentlet(method, structure, data, callback) {

        // Validate the structure and data parameters
        if (structure === undefined) {
            this.log('You must specify a structure.', 'error');
            return false;
        } else if (data === undefined || Object.getOwnPropertyNames(data).length < 1) {
            this.log('No data was passed.', 'error');
            return false;
        }

        // We set the structure field name by determining if the structure
        // was passed as an identifier or a name
        data[this.isIdentifier(structure) ? 'stId' : 'stName'] = structure;

        var id = (++this.idCounter);

        this.log(`[${id}] Starting contentlet ${method} to server.`, 'debug');

        jQuery.ajax({
            url: `/api/content/${method}/1`,
            type: 'PUT',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: (data) => {
                this.log(`[${id}] Completed successfully!`, 'success');
                if (typeof callback === 'function') {
                    callback();
                }
            },
            error: () => {
                this.log(`[${id}] Did not complete successfully.`, 'error');
            }
        });
    }

    /**
     * Retreives contentlet for the supplied identifier and passes it to the callback function.
     * @param  string   identifier Identifier of the contentlet to be retrieved.
     * @param  function callback   Function that is called once the contentlet has been retrieved.
     */
    getContentlet(identifier, callback) {
        jQuery.ajax({
            url: '/api/content/id/' + identifier,
            dataType: 'JSON',
            success: (data) => {
                if (typeof callback === 'function') {
                    callback(data.contentlets[0] || false);
                }
            }
        });
    }

    /**
     * Determines if a string matches the pattern of a dotCMS identifier (UUID).
     * @param  string  str The string that will be tested.
     * @return boolean
     */
    isIdentifier(str) {
        return !!str.match(/^[0-9a-f]{18}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    }

    /**
     * Logs a message to the console.
     * @param  string msg  The message to log.
     * @param  string type The type of message. Changes the color.
     * @return
     */
    log(msg, type) {
        if (!this.debug) {
            return false;
        }
        var baseCss = 'padding: 4px 4px; color: white; line-height: 1.8em; border-radius: 1px;';
        msg = '%c' + msg;
        switch (type) {
            case 'primary':
            case 'debug':
                return console.log(msg, baseCss + 'background-color: #428bca;');
            case 'info':
                return console.log(msg, baseCss + 'background-color: #5bc0de;');
            case 'error':
            case 'danger':
                return console.log(msg, baseCss + 'background-color: #d9534f;');
            case 'success':
                return console.log(msg, baseCss + 'background-color: #5cb85c;');
            case 'warning':
                return console.log(msg, baseCss + 'background-color: #f0ad4e;');
            case undefined:
            case 'default':
                return console.log(msg, 'padding: 4px 4px; line-height: 1.8em;');
            default:
                return console.log(msg, 'padding: 4px 4px; line-height: 1.8em;');
        }
    }

    /**
     * Publishes a new contentlent.
     * @param  string   structure The structure the contentlet belongs to.
     * @param  object   data      The contentlet's parameters.
     * @param  function callback  The function that will be called when the
     * transaction has completed.
     */
    publishContentlet(structure, data, callback) {
        return this.createContentlet('publish', structure, data, callback);
    }

    /**
     * Removes the lock on an identifier.
     * @param  string identifier The Contentlet identifier to remove.
     * @return boolean
     */
    removeLock(identifier) {
        return !!this.identifierLock.splice(this.identifierLock.indexOf(identifier), 1);
    }

    /**
     * Saves a new contentlent without publishing it.
     * @param  string   structure The structure the contentlet belongs to.
     * @param  object   data      The contentlet's parameters.
     * @param  function callback  The function that will be called when the
     * transaction has completed.
     */
    saveContentlet(structure, data, callback) {
        return this.createContentlet('save', structure, data, callback);
    }

    /**
     * Updates a contentlet.
     * @param  string   identifier The contentlet's identifier.
     * @param  string   structure  The contentlet's structure name or structure identifier.
     * @param  object   data       The data to change on the contentlet.
     * @param  function callback   Function that is called after the update has completed.
     * @return boolean Returns false if the record has been locked.
     */
    updateContentlet(identifier, structure, data, callback, id) {

        // Validate parameters
        if (identifier === undefined) {
            this.log('You must specify an identifier.', 'error');
            return false;
        } else if (structure === undefined) {
            this.log('You must specify a structure.', 'error');
            return false;
        } else if (data === undefined || Object.getOwnPropertyNames(data).length < 1) {
            this.log('No data was passed.', 'error');
            return false;
        }

        // Manage Contentlet locking
        if (this.identifierLock.indexOf(identifier) !== -1) {
            this.log(`Lock exists for ${identifier}.`, 'error');
            return false;
        } else {
            this.identifierLock.push(identifier);
        }

        // Set id
        if (id === undefined) {
            id = (++this.idCounter);
        }

        // Add the identifier and structure to the data payload
        data.identifier = identifier;
        // We set the structure field name by determining if the structure
        // was passed as an identifier or a name
        data[this.isIdentifier(structure) ? 'stId' : 'stName'] = structure;

        this.log(`[${id}] Started.`, 'debug');

        jQuery.ajax({
            url: '/api/content/publish/1',
            type: 'PUT',
            data: data,
            success: () => {
                // Log it!
                this.log(`[${id}] Contentlet update successful.`, 'success');
                // Fire the callback function
                if (typeof callback === 'function') {
                    callback();
                }
                // Remove the lock on the identifier
                this.removeLock(identifier);
            },
            error: () => {
                this.log(`[${id}] Contentlet update unsuccessful.`, 'error');
                // Remove the lock on the identifier
                this.removeLock(identifier);
            }
        });

        return true;
    }

    /**
     * Updates a collection of contentlets one at a time.
     * @param  array    identifiers An array of contentlet identifiers (strings).
     * @param  string   structure   The structure name or structure identifier the contentlets belong to.
     * @param  object   data        The data to change on the contentlets.
     * @param  function callback    Function that is called after the updates have all completed.
     */
    updateContentlets(identifiers, structure, data, callback) {

        var count = identifiers.length,
            current = 0,
            main = (current) => {

                // Build the ID
                var id = `${current + 1}/${count}`;

                this.updateContentlet(identifiers[current], structure, data, () => {
                    if ((current + 1) < count) {
                        main(++current);
                    } else if (typeof callback === 'function') {
                        callback(current, count);
                    }
                }, id);
            };
            // Start!
            main(current);
    }
}
const utils = require('@satellite-earth/utils');


class Message {

	constructor (data) {

		let payload; // Message data may be passed as json or uri
		if (typeof data === 'object') {
			payload = data._signed_ ? data : { _signed_: data };
		} else if (typeof data === 'string') {
			payload = { _signed_: {}, _params_: {} };
			const i0 = data.indexOf('?');
			const i1 = data.indexOf('#');
			const i = i0 > i1 ? i0 : i1;
			const s = i > -1 ? data.slice(i + 1) : data;
			for (let c of s.split('&')) {
				const kvp = c.split('=');
				const key = decodeURIComponent(kvp[0]);
				const val = decodeURIComponent(kvp[1]);
				for (let prefix of Object.keys(payload)) {
					if (key.indexOf(prefix) !== -1) {
						payload[prefix][key.substring(prefix.length)] = val;
					}
				}
			}
		} else if (typeof payload === 'undefined') {
			payload = {}; // Init with empty payload
		} else {
			throw Error('Must provide message as json or url-encoded data');
		}

		this._signed_ = payload._signed_ || {};
		this._params_ = payload._params_ || {};

		// Convert all values in signed dict to strings
		// to accurately store large integers, and also
		// since data is packed this way to be verified
		for (let key of Object.keys(this._signed_)) {
			const value = this._signed_[key];
			if (typeof value !== 'string') {
				this._signed_[key] = JSON.stringify(value);
			}
		}

		this.verified = false;
	}

	// Expects Earth API instance allowing
	// user to sign data in the browser
	async sign (earth, domain = [], options = {}) {

		if (!earth) {
			throw Error('Missing required Earth API instance');
		}

		const { _params_ } = await earth.signData(this._signed_, domain, options);
		this._params_ = { ...this._params_, ..._params_ };

		return this;
	};

	// Verify authorship with a remote nameserver or Ethereum provider
	async verify (earth, domain = []) {

		if (!earth) {
			throw Error('Must provide Earth API instance');
		}

		if (!this._signed_ || this.keys.length === 0) {
			throw Error('Cannot verify empty message');
		}

		if (!this.signature) {
			throw Error('Missing required \'sig\' param');
		}

		const author = await earth.verifyData(this, domain);
		return this.authorize(author);
	}

	// Verify authorship with local directory or namespace instance
	verifySync (earth, domain = []) {

		if (!earth) {
			throw Error('Must provide Earth API instance');
		}

		if (!this._signed_ || this.keys.length === 0) {
			throw Error('Cannot verify empty message');
		}

		if (!this.signature) {
			throw Error('Missing required \'sig\' param');
		}

		const author = earth.verifyDataSync(this, domain);
		return this.authorize(author);
	}

	// Compare existing author alias/address params to given values
	authorize (author = {}) {

		for (let param of Object.keys(author)) {
			if (typeof this._params_[param] !== 'undefined') {

				const compare = param === 'address' ? utils.addressEqual : (a, b) => {
					return a === b;
				};

				if (!compare(this._params_[param], author[param])) {
					throw Error(`Claimed ${param} does not match provided value`);
				}

			} else {
				this._params_[param] = author[param];
			}
		}

		this.verified = true;
		return this;
	}

	// Compute author address
	address (domain = []) {

		if (typeof this._signed_ === 'undefined' || Object.keys(this._signed_).length === 0) {
			throw Error('Cannot compute author address of empty message');
		}

		if (!this.signature) {
			throw Error('Cannot compute author address without signature');
		}

		this._params_.address = utils.addressData(this._signed_, this.signature, domain);
		return this;
	}

	addParams (obj) {
		const keys = Object.keys(obj);
		if (keys.indexOf('alias') !== -1 || keys.indexOf('sig') !== -1) {
			this.clearSig(); // Unverify if changing sig or alias params
		}
		for (let key of keys) {
			this._params_[key] = obj[key];
		}
	}

	addSigned (obj) {
		const keys = Object.keys(obj);
		if (keys.length > 0) {
			this.clearSig(); // Unverify if changing signed data
		}
		for (let key of keys) {
			this._signed_[key] = obj[key];
		}
	}

	clearSig () {
		this._params_.sig = undefined;
		this.verified = false;
	}

	// Canonical sort order for signed messages
	compare (that) {
		const a = this.uuid;
		const b = that.uuid;
		return this.uuid.localeCompare(that.uuid);
	}

	toString () {
		return JSON.stringify(this.payload);
	}

	set authorAlias (alias) {
		this._params_.alias = utils.zcut(utils.utf8ToHex(alias));
		this.verified = false;
	}

	set signature (sig) {
		this._params_.sig = sig.substring(0, 2) === '0x' ? sig.slice(2) : sig;
		this.verified = false;
	}

	// The uuid is derived from the message's alias signature,
	// defined as first 40 chars of sig, exlcuding hex prefix 
	get uuid () {
		
		if (this.signature) {
			return this.signature.substring(0, 40);
		} else {

			// The reason to throw an error when trying to get a uuid which
			// does not exist (as opposed to simply returning undefined) is
			// to avoid the situation where a developer (reasonably) checks
			// for message equality by comparing uuid's only to get a false
			// positive (because undefined === undefined evaluates to true)
			throw Error('Cannot access \'uuid\' for unsigned message.');
		}
	};

	// Payload as uri component, useful for making signed GET requests
	get uri () {

		const encoded = [];

		for (let pre of [ '_params_', '_signed_' ]) {

			const values = [];

			for (let k of Object.keys(this[pre]).sort()) {
				values.push(`${encodeURIComponent(pre + k)}=${encodeURIComponent(this[pre][k])}`);
			}

			if (values.length > 0) {
				encoded.push(values.join('&'));
			}
		}

		if (encoded.length > 0) {
			return encoded.join('&');
		}

		return;
	}

	get namespace () {
		return this._params_.namespace;
	}

	// Utf8 representation of alias linked to signing address
	get authorAlias () {

		if (typeof this._params_.alias === 'undefined') {
			return;
		}

		return utils.hexToUtf8('0x' + this._params_.alias);
	}

	// Ethereum address which signed data
	get authorAddress () {
		return this._params_.address;
	}

	// Signature created from user's private key
	get signature () {
		return this._params_.sig;
	}

	// Signed data keys
	get keys () {
		return Object.keys(this._signed_);
	}

	// Message payload, including signed data and all params.
	// Useful for display or when storing precomputed values.
	// Payload is cloned to avoid unintentional modification.
	get payload () {
		return JSON.parse(JSON.stringify({
			_signed_: this._signed_,
			_params_: this._params_
		}));
	}
}

module.exports = Message;

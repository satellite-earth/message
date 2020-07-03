const utils = require('@satellite-earth/dev-utils');

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
	async sign (earth, domain = []) {

		if (!earth) {
			throw Error('Missing required Earth API instance');
		}

		try {
			const { _params_ } = await earth.signData(this._signed_, domain);
			this._params_ = { ...this._params_, ..._params_ };
			this.verified = true;
		} catch (err) {
			throw Error(err);
		}

		return this;
	};

	// Look at the blockchain to see if the alias linked to the
	// address which signed this data matches the claimed alias
	async verify (earth, domain = []) {

		if (!earth) { // Earth API is needed for interfacing with contract
			throw Error(`Must provide Earth API instance`);
		}

		const claimedAlias = this._params_.alias;
		let authorship;

		if (!this.signature) {
			throw Error('Missing required \'sig\' param');
		}

		try {
			authorship = await earth.verifyData(this, domain);
		} catch (err) {
			console.log(err);
			throw Error('Failed to get alias');
		}

		// If message already claims an alias author, throw
		// an error if the verified alias doesn't match. If
		// there is no claimed author just save the result.
		if (claimedAlias && claimedAlias !== authorship.alias) {
			throw Error('Alias linked to address does not match alias in _params_');
		} else {
			this._params_.alias = authorship.alias;
		}

		this.verified = true;
		return this;
	}

	verifySync (earth, blockNumber, domain = []) {

		if (!earth) { // Earth API is needed for interfacing with contract
			throw Error(`Must provide Earth API instance`);
		}

		const claimedAlias = this._params_.alias;
		let authorship;

		if (!this.signature) {
			throw Error('Missing required \'sig\' param');
		}

		try {

			authorship = earth.verifyDataSync(this, blockNumber, domain);

		} catch (err) {
			console.log(err);
			throw Error('Failed to get alias');
		}

		// If message already claims an alias author, throw
		// an error if the verified alias doesn't match. If
		// there is no claimed author just save the result.
		if (claimedAlias && claimedAlias !== authorship.alias) {
			throw Error('Alias linked to address does not match alias in _params_');
		} else {
			this._params_.alias = authorship.alias;
		}

		this.verified = true;
		return this;
	}

	addParams (obj) {
		const keys = Object.keys(obj);
		if (keys.indexOf('alias') !== -1 || keys.indexOf('sig') !== -1) {
			clearSig(); // Unverify if changing sig or alias params
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
			return utils.getMessageUUID(this);
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
		return utils.encodeMessageURI(this.payload);
	}

	// Utf8 representation of alias linked to signing address
	get authorAlias () {
		return this._params_.alias ? utils.hexToUtf8('0x' + this._params_.alias) : undefined;
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

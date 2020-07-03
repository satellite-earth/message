View full documentation at https://docs.satellite.earth/

## Usage

``` js
const Message = require('@satellite-earth/message');
const { Earth } = require('@satellite-earth/core');

// Construct a message with a plain object
// containing the data the user will sign
const message = new Message({
	foo: 'bar',
	whatever: 42
});

// Get Earth API instance to interface
// with the user's Ethereum wallet
const earth = new Earth();

// Connect to injected provider
await earth.connect();

try {

	// Prompt user to sign message
	await message.sign();

} catch (err) {
	// User rejected signature request
}

// Message payload now contains the user's
// signature and their hex-encoded name
console.log(message.payload);
// {
// 	_signed_: {
// 		foo: 'bar',
// 		whatever: 42
// 	},
// 	_params_: {
// 		alias: '736174656c6c697465',
// 		sig: '2280542a7dd337a1c8a92125dd399e482689bd22b5cf85fa1d6d09930bac8b7f4e95902fe4a72e29ee79583a169d89b06b51049d6c02c04268ec790d061c2f5b1c'
// 	}
// }

// . . .

// This payload can be used to reconstruct
// the message and verify its authorship
const _message = new Message(message.payload);

try {
	await message.verify(earth);
	console.log('Message signed by ' + message.authorAlias);
} catch () {
	// Failed to verify
}
```

**Constructor**

1. `Object|String` - Message payload. Can be object or uri-encoded.

## Properties

### \_signed\_

``` js
message._signed_
// {
// 	foo: 'bar',
// 	whatever: 42
// }
```

`Object` - The message's signed data

---


### \_params\_

``` js
message._params_
// {
// 	alias: '736174656c6c697465',
// 	sig: '2280542a7dd337a1c8a92125dd399e482689bd22b5cf85fa1d6d09930bac8b7f4e95902fe4a72e29ee79583a169d89b06b51049d6c02c04268ec790d061c2f5b1c'
// }
```

`Object` - Meta data, including user's `alias` name and user's `sig` 

---

### uuid

``` js
message.uuid // '2280542a7dd337a1c8a92125dd399e482689bd22'
```

`String` - The message's universal unique identifier. `uuid` is not defined until the user has signed the message.

---

### uri

``` js
message.uri // _signed_foo=bar&_signed_whatever=42&_params_alias=736174656c6c697465&_params_sig=2280542a7dd337a1c8a92125dd399e482689bd22b5cf85fa1d6d09930bac8b7f4e95902fe4a72e29ee79583a169d89b06b51049d6c02c04268ec790d061c2f5b1c
```

`String` - URL-encoded message payload. This value may be passed directly to the Message constructor. Useful for creating signed URLs.

---

### authorAlias

``` js
message.authorAlias // satellite
```

`String` - Author's `alias` name in utf8

---

### authorAddress

``` js
message.authorAddress // '0x7034412De72956e1105134a35b2f23f6b071010d'
```

`String` - Author's Ethereum address, as computed from signature

---

### signature

``` js
message.signature // '2280542a7dd337a1c8a92125dd399e482689bd22b5cf85fa1d6d09930bac8b7f4e95902fe4a72e29ee79583a169d89b06b51049d6c02c04268ec790d061c2f5b1c'
```

`String` - Author's signature

---

### keys

``` js
message.keys(); // [ 'foo', 'whatever' ]
```

`Array` - Object keys of the `_signed_` object. Useful for iterating across signed data.

---

### payload

``` js
message.payload;
// {
// 	_signed_: {
// 		foo: 'bar',
// 		whatever: 42
// 	},
// 	_params_: {
// 		alias: '736174656c6c697465',
// 		sig: '2280542a7dd337a1c8a92125dd399e482689bd22b5cf85fa1d6d09930bac8b7f4e95902fe4a72e29ee79583a169d89b06b51049d6c02c04268ec790d061c2f5b1c'
// 	}
// }
```

`Object` - Plain object containing `_signed_` and `_params_`. May be passed directly to Message constructor to rebuild message.

---

### verified

``` js
message.verified // true
```

`Boolean` - If message has been successfully verifed

## Methods

### sign

``` js
try {

	// Prompt user to sign message
	await message.sign(earth);

} catch (err) {
	// User rejected signature request
}
```

Prompt user to sign message in the browser

**Parameters**

1. `Earth` - Earth API instance
2. `Array` - (optional) EIP-712 domain expressed as array of objects containing `name`, `type`, and `value`

**Returns**

`Promise` returns `this` - Reference to self allows method chaining

---

### verify

``` js
try {

	// Attempt to verify
	await message.verify(earth);

} catch (err) {
	// Failed to verify
}
```

Verify integrity and authorship of message asynchronously by referencing the blockchain.

**Parameters**

1. `Earth` - Earth API instance
2. `Array` - (optional) EIP-712 domain expressed as array of objects containing `name`, `type`, and `value`

**Returns**

`Promise` returns `this` - Reference to self allows method chaining

---

### verifySync

``` js
try {

	// Attempt to verify
	message.verifySync(earth, 10190026);

} catch (err) {
	// Failed to verify
}
```

Verify integrity and authorship of message synchronously by referencing Earth's internal alias directory. The second parameter is the block number at which to verify authorship. This is important because users can change the address linked to their alias name. Useful for historical verification of messages.

**Parameters**

1. `Earth` - Earth API instance
2. `Number` - (optional) Block number at which to verify authorship (default latest block synced in directory)
3. `Array` - (optional) EIP-712 domain expressed as array of objects containing `name`, `type`, and `value`

**Returns**

`this` - Reference to self allows method chaining

---

### addParams

``` js
message.addParams({ foo: 'bar' whatever: 'you want' });
```

Add data to the `_params_` object

**Parameters**

1. `Object` - Data to add

---

### addSigned

``` js
message.addSigned({ foo: 'bar' whatever: 'you want' });
```

Add data to the `_signed_` object. Note that calling this method will clear any existing user signature.

**Parameters**

1. `Object` - Data to add

---

### clearSig

``` js
message.clearSig();
```

Removes any existing signature and sets `verified` to `false`

---

### compare

``` js
[ message, otherMessage ].sort((a, b) => {
	return a.compare(b);
}); 
```

Get the relative sort position of this message as compared to another

**Parameters**

1. `Message` - Message to which `this` is being compared

**Returns**

`Number` - Integer representing sort order. See docs for [localeCompare](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare)

let semver = require( 'semver' );

let availableVersions = [
    "1001.1001.1000-dev-harmony-fb",
    "1001.1001.1001-dev-harmony-fb",
    "1001.1001.2000-dev-harmony-fb",
    "2001.1001.2000-dev-harmony-fb",
    "2001.1001.0-dev-harmony-fb",
    "3001.1.0-dev-harmony-fb",
    "4001.1.0-dev-harmony-fb",
    "4001.1001.0-dev-harmony-fb",
    "4001.3001.0-dev-harmony-fb",
    "5001.1.0-dev-harmony-fb",
    "6001.1.0-dev-harmony-fb",
    "6001.1001.0-dev-harmony-fb",
    "7001.1.0-dev-harmony-fb",
    "8001.1.0-dev-harmony-fb",
    "8001.1001.0-dev-harmony-fb",
    "8001.2001.0-dev-harmony-fb",
    "9001.1.0-dev-harmony-fb",
    "10001.1.0-dev-harmony-fb",
    "11001.1.0-dev-harmony-fb",
    "12001.1.0-dev-harmony-fb",
    "13001.1.0-dev-harmony-fb",
    "13001.1001.0-dev-harmony-fb",
    "14001.1.0-dev-harmony-fb",
    "15001.1.0-dev-harmony-fb",
    "15001.1001.0-dev-harmony-fb"
];

// https://github.com/facebook/esprima/tree/fb-harmony
let badFacebook = '~3001.0001.0000-dev-harmony-fb';
let goodFacebook = '3001.1.0-dev-harmony-fb';
let url = 'https://tgz.pm2.io/gkt-1.0.0.tgz';

let problemValue = url;
// let problemValue = badFacebook;
let validated = semver.valid( problemValue, true );
let cleaned = semver.clean( problemValue, true );
let validatedAndCleaned = ( validated === null ) ? null : semver.clean( validated );
let validRange = semver.validRange( problemValue, true );
let cleanedValidRange = ( validRange === null ) ? null : semver.clean( validRange );

console.log( 'input => ' + problemValue );
// console.log( 'validated => ' + validated );
// console.log( 'cleaned => ' + cleaned );
// console.log( 'validated & cleaned => ' + validatedAndCleaned );
console.log( 'valid range => ' + validRange );
// console.log( 'valid range & cleaned => ' + cleanedValidRange );

// let parsedComparator = new semver.Comparator( problemValue );
// console.log( 'parsed => ' + parsedComparator.semver.version );

// let parsedRange = new semver.Range( problemValue, true );
let parsedRange = semver.validRange( problemValue, true );
console.log( 'parsed range (loose) => ' + parsedRange );

let strictParsedCheck = semver.maxSatisfying( availableVersions, parsedRange );
console.log( 'strict loosely-parsed-range check => ' + strictParsedCheck );

let looseCheck = semver.maxSatisfying( availableVersions, problemValue, true );
console.log( 'loose check => ' + looseCheck );

let strictCheck = semver.maxSatisfying( availableVersions, problemValue );
console.log( 'strict check => ' + strictCheck );


"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var axios_1 = require("axios");
var cheerio_1 = require("cheerio");
var d3_dsv_1 = require("d3-dsv");
var fs = require("fs");
var path = require("path");
function getPropertyURI(streetNumber, streetName) {
    return "https://realestate.alexandriava.gov/index.php?StreetNumber=".concat(streetNumber, "&StreetName=").concat(streetName, "UnitNo=&Search=Search");
}
console.log('I ran.');
fs.readFile(path.join(__dirname, '../../data/test.csv'), 'utf-8', function (err, data) {
    if (err)
        console.error(err);
    var streetAddresses = (0, d3_dsv_1.csvParse)(data).map(function (address) {
        return {
            streetNumber: address.STNUM,
            streetName: [address.STPFX, address.STNAME, address.STTYPE].join('%5')
        };
    });
    console.log(streetAddresses);
    var accounts = streetAddresses.map(function (_a) {
        var streetNumber = _a.streetNumber, streetName = _a.streetName;
        return __awaiter(void 0, void 0, void 0, function () {
            var HTMLData, $;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, axios_1["default"].get(getPropertyURI(+streetNumber, streetName))];
                    case 1:
                        HTMLData = _b.sent();
                        console.log(HTMLData.status);
                        $ = cheerio_1["default"].load(HTMLData.data);
                        return [2 /*return*/, $('.searchResultDetailRow td:nth-of-type(3) span:nth-of-type(2)').text()];
                }
            });
        });
    });
    console.log(accounts);
});

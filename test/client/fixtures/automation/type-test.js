var hammerhead   = window.getTestCafeModule('hammerhead');
var browserUtils = hammerhead.utils.browser;

var testCafeCore      = window.getTestCafeModule('testCafeCore');
var preventRealEvents = testCafeCore.get('./prevent-real-events');
var parseKeySequence  = testCafeCore.get('./utils/parse-key-sequence');

var testCafeAutomation = window.getTestCafeModule('testCafeAutomation');
var TypeAutomation     = testCafeAutomation.Type;
var PressAutomation    = testCafeAutomation.Press;
var TypeOptions        = testCafeAutomation.get('../../test-run/commands/options').TypeOptions;

preventRealEvents();

$(document).ready(function () {
    var $commonInput = null;

    //constants
    var TEST_ELEMENT_CLASS = 'testElement';


    //tests
    QUnit.testStart(function () {
        $commonInput = $('<input type="text" id="input" class="input"/>').addClass(TEST_ELEMENT_CLASS).appendTo($('body'));
    });

    QUnit.testDone(function () {
        $('body').focus();
        $('.' + TEST_ELEMENT_CLASS).remove();
    });

    asyncTest('typetext events', function () {
        var keydownCount    = 0;
        var keyupCount      = 0;
        var keypressCount   = 0;
        var mouseclickCount = 0;

        $commonInput
            .keydown(function () {
                keydownCount++;
            })
            .keyup(function () {
                keyupCount++;
            })
            .keypress(function () {
                keypressCount++;
            })
            .click(function () {
                mouseclickCount++;
            });

        var type = new TypeAutomation($commonInput[0], 'HI', new TypeOptions({ offsetX: 5, offsetY: 5 }));

        type
            .run()
            .then(function () {
                equal(keydownCount, 2, 'keydown event raises twice');
                equal(keyupCount, 2, 'keyup event raises twice');
                equal(keypressCount, 2, 'keypress event raises twice');
                equal(mouseclickCount, 1, 'click event raises once');

                start();
            });
    });

    asyncTest('input value changed', function () {
        $('<input type="text" id="input1" class="input"/>').addClass(TEST_ELEMENT_CLASS).appendTo($('body'));

        var $inputs = $('.' + TEST_ELEMENT_CLASS);
        var text    = 'Hello, world!';

        var firstType = new TypeAutomation($inputs[0], text, new TypeOptions({ offsetX: 5, offsetY: 5 }));

        firstType
            .run()
            .then(function () {
                var secondType = new TypeAutomation($inputs[1], text, new TypeOptions({ offsetX: 5, offsetY: 5 }));

                return secondType.run();
            })
            .then(function () {
                equal($inputs[0].value, text, 'first elements value setted');
                equal($inputs[1].value, text, 'second elements value setted');

                start();
            });
    });

    asyncTest('correct keyCode', function () {
        var key = 'k';

        $commonInput[0].onkeypress = function (e) {
            equal((e || window.event).keyCode, key.charCodeAt(0), 'keypress event argument is correct');
        };

        var type = new TypeAutomation($commonInput[0], key, new TypeOptions({ offsetX: 5, offsetY: 5 }));

        type
            .run()
            .then(function () {
                expect(1);
                start();
            });
    });

    asyncTest('typetext to inner input', function () {
        var $outerDiv = $('<div></div>')
            .css({
                width:  '100px',
                height: '50px'
            })
            .addClass(TEST_ELEMENT_CLASS).appendTo('body');

        var text = 'Hi';

        $commonInput.appendTo($outerDiv);

        var type = new TypeAutomation($outerDiv[0], text, new TypeOptions());

        type
            .run()
            .then(function () {
                equal($commonInput[0].value, text, 'text to inner input has been written');
                start();
            });
    });

    asyncTest('do not click when element is focused', function () {
        var clickCount = 0;
        var text       = 'test';

        $commonInput.click(function () {
            clickCount++;
        });

        $commonInput[0].focus();

        var type = new TypeAutomation($commonInput[0], text, new TypeOptions());

        type
            .run()
            .then(function () {
                equal(clickCount, 0);
                equal($commonInput[0].value, text, 'text to inner input has been written');
                start();
            });
    });

    asyncTest('set option.replace to true to replace current text', function () {
        var text = 'new text';

        $commonInput[0].value = 'old text';

        var type = new TypeAutomation($commonInput[0], text, new TypeOptions({ replace: true, offsetX: 5, offsetY: 5 }));

        type
            .run()
            .then(function () {
                equal($commonInput[0].value, text, 'old text replaced');
                start();
            });
    });

    asyncTest('do not change readonly inputs value', function () {
        var $input1      = $('<input type="text" readonly />').addClass(TEST_ELEMENT_CLASS).appendTo($('body'));
        var $input2      = $('<input type="text" value="value" />').attr('readonly', 'readonly').addClass(TEST_ELEMENT_CLASS).appendTo($('body'));
        var oldInput1Val = $input1.val();
        var oldInput2Val = $input2.val();

        var firstType = new TypeAutomation($input1[0], 'test', new TypeOptions());

        firstType
            .run()
            .then(function () {
                var secondType = new TypeAutomation($input2[0], 'test', new TypeOptions());

                return secondType.run();
            })
            .then(function () {
                ok($input1.val() === oldInput1Val);
                ok($input2.val() === oldInput2Val);
                start();
            });
    });

    module('regression tests');

    asyncTest('input event raising (B253410)', function () {
        var $input = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        var $div   = $('<div></div>').addClass(TEST_ELEMENT_CLASS).appendTo('body');

        $input.bind('input', function () {
            $div.text($div.text() + $input.val());
            $input.val('');
        });

        var type = new TypeAutomation($input[0], 'test', new TypeOptions({ offsetX: 5, offsetY: 5 }));

        type
            .run()
            .then(function () {
                equal($div.text(), 'test');
                equal($input.val(), '');
                start();
            });
    });

    asyncTest('change event must not be raised if keypress was prevented (B253816)', function () {
        var $input  = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        var changed = false;

        $input.bind('change', function () {
            changed = true;
        });

        var firstType = new TypeAutomation($input[0], 'test', new TypeOptions({ offsetX: 5, offsetY: 5 }));

        firstType
            .run()
            .then(function () {
                $input[0].blur();

                ok(changed, 'check change event was raised if keypress was not prevented');

                changed = false;

                $input.bind('keypress', function (e) {
                    e.target.value += String.fromCharCode(e.keyCode);
                    return false;
                });

                var secondType = new TypeAutomation($input[0], 'new', new TypeOptions({ offsetX: 5, offsetY: 5 }));

                return secondType.run();
            })
            .then(function () {
                $input[0].blur();

                ok(!changed, 'check change event was not raised if keypress was prevented');
                start();
            });
    });

    asyncTest('keypress args must contain charCode of the symbol, not keyCode', function () {
        var $input   = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        var symbol   = '!';
        var charCode = 33;
        var keyCode  = 49;

        $input.bind('keypress', function (e) {
            equal(e.keyCode, charCode, 'keyCode on keypress checked');
            equal(e.charCode, charCode, 'charCode on keypress checked');
        });

        $input.bind('keydown', function (e) {
            equal(e.keyCode, keyCode, 'keyCode on keydown checked');
        });

        var type = new TypeAutomation($input[0], symbol, new TypeOptions({ offsetX: 5, offsetY: 5 }));

        type
            .run()
            .then(function () {
                equal($input.val(), symbol, 'input value checked');
                start();
            });
    });

    asyncTest('T138385 - "input" event is raised if symbol count more than "maxlength" attribute (act.type)', function () {
        var $input          = $('<input type="text" maxlength="3"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        var inputEventCount = 0;

        $input.bind('input', function () {
            inputEventCount++;
        });

        var type = new TypeAutomation($input[0], 'test', new TypeOptions({ offsetX: 5, offsetY: 5 }));

        type
            .run()
            .then(function () {
                equal(inputEventCount, 4);
                equal($input.val(), 'tes');
                start();
            });
    });

    asyncTest('T138385 - "input" event is raised if symbol count more than "maxlength" attribute (act.press)', function () {
        var $input          = $('<input type="text" maxlength="3"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        var inputEventCount = 0;

        $input.bind('input', function () {
            inputEventCount++;
        });

        $input.focus();

        var press = new PressAutomation(parseKeySequence('t e s t').combinations);

        press
            .run()
            .then(function () {
                equal(inputEventCount, 4);
                equal($input.val(), 'tes');
                start();
            });
    });

    asyncTest('T239547: TD15.1 - Playback problems on https://jsfiddle.net/', function () {
        var $input   = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        var charCode = 45;
        var keyCode  = browserUtils.isFirefox ? 173 : 189;

        $input.bind('keypress', function (e) {
            equal(e.keyCode, charCode, 'keyCode on keypress checked');
            equal(e.charCode, charCode, 'charCode on keypress checked');
        });

        $input.bind('keydown', function (e) {
            equal(e.keyCode, keyCode, 'keyCode on keydown checked');
        });

        var type = new TypeAutomation($input[0], '-', new TypeOptions({ offsetX: 5, offsetY: 5 }));

        type
            .run()
            .then(function () {
                equal($input.val(), '-', 'input value checked');
                start();
            });
    });
});

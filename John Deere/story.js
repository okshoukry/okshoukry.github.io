// Created with Squiffy 5.0.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
            var incDecRegex = /^([\w]*)\s*([\+\-])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
                rhs = parseFloat(incDecMatch[3]);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);

            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = '_default';
squiffy.story.id = '2a60d0a383';
squiffy.story.sections = {
	'_default': {
		'text': "<p><img src = \"image_1.jpg\"></p>\n<my_button>\n<a class=\"squiffy-link link-passage\" data-passage=\"START\" role=\"link\" tabindex=\"0\">START</a>\n</my_button>",
		'passages': {
			'START': {
				'text': "<center><font size=\"7\" face=\"Laconic\">\nBRIEFING \n<br></font>\n\n<font size=\"6\"><strong>T</strong></font>hings are heating up so quickly here at John Deere. As one of the biggest agricultural, construction, and forestry machinery manufacturers, the company needs your expertise, as a skilled business consultant, in making some critical decisions. Remember! Each and every decision has an impact (and consequences) on the company’s performance…Good luck!\n</center>\n\n<my_button>\n<a class=\"squiffy-link link-passage\" data-passage=\"OK\" role=\"link\" tabindex=\"0\">OK</a>\n</my_button>",
			},
			'OK': {
				'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nFRIDAY \n<br>\n</font></center>\n\n<p><img src = \"image_2.jpg\"></p>\n<p align=\"justify\">\n<font size=\"6\"><strong>Y</strong></font>ou are standing in your office when you see Kelly, the new assigned business transformation manager here at John Deere, knocking on the door. &quot;Come in!&quot; You say with a smile, greeting her as she gets inside. &quot;Sorry for bothering you so early in the morning...&quot; Kelly says as she approaches your desk. &quot;Don&#39;t worry about it! Please, have a seat!&quot; You say while pointing to the chair for Kelly. &quot;Thanks for agreeing to meet me without an advance notice!&quot; She says while grabbing the seat and sitting slowly. “Don’t worry, so what is bothering you?&quot; You ask her after taking a sip of your warm coffee. &quot;As you know, Deere is considering how to introduce its new bulldozer, the JD 750, a machine substantially larger than any it had previously built...&quot; You nod as she continues.. “In addition, decisions have to be made on the even bigger JD 850 launching next year..&quot; She says nervously with a trembling voice. “Oh! That’s huge...&quot; You feel surprised and then continue to say...\n</p>\n\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"No! I don’t think the company should do that\" role=\"link\" tabindex=\"0\">No! I don’t think the company should do that</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We definitely need to analyse this\" role=\"link\" tabindex=\"0\">We definitely need to analyse this</a>\n</my_button>",
			},
		},
	},
	'No! I don’t think the company should do that': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“Really? Why??” Kelly asks surprisingly. “Well, I don’t really think we need this here in John Deere.” You calmly explain and continue to say “We are having a descent market share at the moment and we don’t need to explore new markets since the industry looks stable.” Kelly listens as you make your point but doesn’t look convinced. She hesitates for a second and then asks “Umm…Are you sure?” You smile and assure her “Yes, don’t worry about it. Our current machines are doing well in the market and that is more than enough.” “OK! I will cancel the plans then and will keep you informed about how it goes.” She says while leaving the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Exit the office\" role=\"link\" tabindex=\"0\">Exit the office</a>\n</my_button>",
		'passages': {
		},
	},
	'Exit the office': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We cancelled all our plans for the JD 750 and JD 850 as per your recommendations. However, another company called Terex is launching a similar machine to the JD 750. The initial signs look so promising for them with a prediction of eating most of our market share. I am not sure that was the right decision to make without analyzing the market first…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. Maybe this was not the best decision after all.\n</p>\n\n<p><a href=\"#\" style=\"text-decoration: none;\"></p>\n<p><my_button>\nTRY AGAIN!\n</my_button>\n</a></p>",
		'passages': {
		},
	},
	'We definitely need to analyse this': {
		'text': "<p align=\"justify\">\n“Well, let me give you a brief background about the company…” Kelly says as she takes a deep breath “Deere had begun by manufacturing farm equipment (which still account for the majority of the business) where we had developed an outstanding reputation for reliability and engineering excellence.” You nod as she continues “In the early 1960s, we had diversified into bulldozers concentrating on smaller machines, first with the JD 350 (42 horse power), then adding the JD 450 (65 hp) and most recently the JD 550 (72 hp)…” You listen carefully and then interfere…\n</p>\n\n<p><img src = \"image_3.jpg\"></p>\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"What information do we have about the market?\" role=\"link\" tabindex=\"0\">What information do we have about the market?</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should follow the same footsteps and launch the 2 models\" role=\"link\" tabindex=\"0\">We should follow the same footsteps and launch the 2 models</a>\n</my_button>",
		'passages': {
		},
	},
	'We should follow the same footsteps and launch the 2 models': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“You mean we should use the same marketing strategy we use for other machines to promote the JD 750 and JD 850?” Kelly asks. “Exactly!” You respond confidently and continue to say “We have done a good job promoting different machines, so we should follow the same strategy for our new machines.” Kelly scribbles your comments on her notebook and says “Okay, will try to get things started as soon as possible since we are in the process of launching The JD 750.” She takes a deep breath and says “I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Exit the building\" role=\"link\" tabindex=\"0\">Exit the building</a>\n</my_button>",
		'passages': {
		},
	},
	'Exit the building': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations and used the same marketing strategy for our new machines. However, the initial indicators seem not so good as our strategy fitted well with clients purchasing small machines but not large ones as the JD 750. I guess this new model needed a different marketing mix based on deep analysis of the targeted market.\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. Maybe this was not the best decision after all.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'What information do we have about the market?': {
		'text': "<p align=\"justify\">\n“Well…” Kelly smiles as she continues “By the late 1970s we were the market leader in North America for under 100 hp machines with a market share of around 60%.” Kelly looks a bit worried as she explains “The JD 750 (110 hp) is our first big machine and, at around $60,000 (excluding extras), would be nearly twice the price of the 550. The new bulldozer is bringing it for the first time into direct competition with Caterpillar&#39;s big machines. As you know CAT&#39;s dominant market share (45% world-wide) and reputation in this sector made it almost the generic name for large bulldozers.” You remain silent for a while and then proceed…\n</p>\n\n<p><img src = \"image_4.jpg\"></p>\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We need more data about the competitors\" role=\"link\" tabindex=\"0\">We need more data about the competitors</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should Attack the market by a low price penetration strategy\" role=\"link\" tabindex=\"0\">We should Attack the market by a low price penetration strategy</a>\n</my_button>",
		'passages': {
		},
	},
	'We should Attack the market by a low price penetration strategy': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“You think we should provide a cheaper price than own main competitor CAT?” Kelly wonders. “Yes, since they have been dominant in the large bulldozer industry then we should follow a cost leadership strategy and try to beat them by providing a much lower price.” You explain as Kelly listens before saying “Well, this way we can actually attract more clients if they are really sensitive to price.” You nod your head agreeing with what she said. &quot;Okay, will talk to the executives and try to get things started as soon as possible since we are in the process of launching The JD 750.” She takes a deep breath and says “I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Leave the building\" role=\"link\" tabindex=\"0\">Leave the building</a>\n</my_button>",
		'passages': {
		},
	},
	'Leave the building': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations and priced the JD 750 at $40,000 close to the JD 550 and much cheaper than CAT&#39;s $60,000. We have already generated some revenues from multiple sales. However, the new machine was not well received by some large bulldozer clients as expected as they were hesitant to switch to ours given the low price that did not reflect our technical superiority. I guess pricing it a little higher would have gained their confidence and even generated more sales…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. Maybe this was not the best decision after all.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'We need more data about the competitors': {
		'text': "<p align=\"justify\">\n“I was expecting that…” Kelly says as she shows you some data on her tablet and discusses it “The bulldozer market in North America was around 17,500 units or $840m. Competition was increasingly tough. Besides CAT, major competitors included International Harvester, Case, Fiat-Allis, Terex (a division of General Motors) and Komatsu. Komatsu’s strategy involved copying Caterpillar designs but then bringing them up to the existing state of the art and offering lower prices. The industry was marked by continuous progress in technical innovation.” You feel impressed by Kelly’s preparations and say…\n</p>\n\n<p><img src = \"image_5.jpg\"></p>\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"match cat price\" role=\"link\" tabindex=\"0\">We have to match the CAT price</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"How is the market segmented?\" role=\"link\" tabindex=\"0\">How is the market segmented?</a>\n</my_button>",
		'passages': {
		},
	},
	'match cat price': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“Well, CAT’s D5 is currently sold at $60,000. Do you think we shall stay within this range?” Kelly asks. “I believe since they are making good profits out of this price and the customers are willing to pay it, then we should match it. This way we won’t undervalue our machine and at the same time don’t risk a higher price that what the current market is used to” You explain as Kelly takes some notes. “This sounds reasonable” She says. really sensitive to price.” You nod your head agreeing with what she said. “Okay, I will try to get things started as soon as possible since we are in the process of launching The JD 750.” She takes a deep breath and says “I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Depart the building\" role=\"link\" tabindex=\"0\">Depart the building</a>\n</my_button>",
		'passages': {
		},
	},
	'Depart the building': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations and priced the JD 750 at $60,500 close to CAT’s D5. We have already generated some descent revenues from multiple sales. However, the initial indicators seem to show that we are not going to achieve our targets since most of the customers will hesitate to switch to ours since they are already familiar with CAT machines and our price did not reflect our technical superiority or differences from CAT&#39;s offering. I guess pricing it much higher would have gained their confidence and even generated more sales…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. Maybe this was not the best decision after all.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'How is the market segmented?': {
		'text': "<p><img src = \"image_6.jpg\"></p>\n<p align=\"justify\">\n“I did some research about this and this is what I found” Kelly says as she scrolls through the data and continues “The bulldozer market is divided into the small (under 100 hp) and large (100 - 200 hp) sectors. The former was dominated by us in the US (total company turnover $3,000m, pre-tax profit $1 55m); CAT had 60% of the latter (turnover $5,000m, profit $653m). Both sectors were about equal in unit terms but the larger sector was twice as big in $ value. The small sector, however, now exhibited faster growth as fewer very large projects (such as the interstate road system and the Alaska pipeline) were occurring in North America. One result might be that large contractors &#39;would become involved in smaller projects and extend their mix of equipment.” Kelly stops as you keep staring at the data and then finally say…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"I need to know more about different CAT machines\" role=\"link\" tabindex=\"0\">I need to know more about different CAT machines</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"I don’t think CAT is our main concern\" role=\"link\" tabindex=\"0\">I don’t think CAT is our main concern</a>\n</my_button>",
		'passages': {
		},
	},
	'I don’t think CAT is our main concern': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“Really??” Kelly asks drawing a completely surprised expression on her face. “Let me explain!” You calm her down and then continue “We have already established a descent market share, and the company already has a powerful reputation to rely on…” You take a deep breath and resume “Our clients, especially the loyal ones will love the new model since it is more powerful. So I don’t think focusing on CAT’s offering is worth it.” Kelly listens to what you say and then interrupt “So you think we don’t have to work on differentiating our offering from CAT’s??” She asks. “Not for the time being. I think we are safe to go relying on our huge customer base.” You explain. “Hmmm, Fine! I will try to get things started as soon as possible since we are in the process of launching The JD 750.” She takes a deep breath and says “I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Leave the room\" role=\"link\" tabindex=\"0\">Leave the room</a>\n</my_button>",
		'passages': {
		},
	},
	'Leave the room': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations and neglected CAT’s offering. We have already generated some descent revenues from some few sales. However, the initial indicators seem to show that we are not going to achieve any of our targets since most of our customers are small machinery clients and not the large machinery ones that we should have targeted. CAT’s domination in that area is going to make it hard, if not impossible, for us to have a sustainable share in it…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. Maybe this was not the best decision after all.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'I need to know more about different CAT machines': {
		'text': "<p><img src = \"image_7.jpg\"></p>\n<p align=\"justify\">\nKelly scrolls through her data and then explains “In 1979 CAT surprised the industry by launching the D3, a 62 hp machine manufactured in Japan as a joint venture with Mitsubishi. The D3 had not, according to industry sources, been very successful. Some people thought it was because CAT dealers were already prosperous and orientated towards larger units. Other CAT machines were the D4 (85 hp), D5 (105 hp), D6 (140 hp) and the new versions of the D7, D8 and D9, the largest bulldozers in its line. The oldest designs were the D5 and D6 which were said to be the &#39;bread and butter&#39; of the CAT line because of the unit volumes involved. CAT had 122 independent dealers with 219 outlets; the dealers&#39; sales ranged from $12m to $70m. By contrast, we had 433 dealers with 437 outlets with dealer turnover in the $1 m to $16m range.” You finish your coffee and then say…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should sell to our same loyal clients\" role=\"link\" tabindex=\"0\">We should sell to our same loyal clients</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"How are clients segmented based on machine size?\" role=\"link\" tabindex=\"0\">How are clients segmented based on machine size?</a>\n</my_button>",
		'passages': {
		},
	},
	'We should sell to our same loyal clients': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“You mean we should focus on the same clients that purchase the JD 550??” Kelly wonders. “Absolutely! Those clients trust us and we have established some good working relations with them.” You explain as Kelly takes some notes and then asks “So we should not market the JD 750 for larger clients?” You pause for a while and the respond “ No! not for the time being. We shall capitalize on our loyal customer base first. At least in the introductory phase.” Kelly takes a deep breath hearing that and then says “Okay, I will talk to the executives and try to get things started as soon as possible since we are in the process of launching The JD 750. I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Leave\" role=\"link\" tabindex=\"0\">Leave</a>\n</my_button>",
		'passages': {
		},
	},
	'Leave': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations and targeted our current customer base. We have already generated few revenues from some sales. However, the initial indicators seem to show that we are not going to achieve any of our targets since most of our customers are small machinery clients and not the large machinery ones that we should have targeted. CAT’s domination in that area is going to make it hard, if not impossible, for us to have a sustainable share in it. Especially due to the fact that those clients require a different marketing mix than that of those we are currently targeting due to different purchasing power, usage and demand…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. Maybe this was not the best decision after all.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'How are clients segmented based on machine size?': {
		'text': "<p><img src = \"image_8.jpg\"></p>\n<p align=\"justify\">\n“Buyers of smaller machines were typically small contractors who used them for general building and utility purposes. Often they were an owner/operator who purchased on the basis of personal attitudes and experience. Price was important and they looked to the local dealer for servicing the machine.” Kelly says as you revise the data and ask her “What about larger contractors?” Kelly pause for a second and then respond “The larger units were purchased by large contractors who specialised in major construction projects (highways, dams, airports, etc.) usually in remote, rural areas. The large contractor moved equipment from one area to another and often owned its own repair and maintenance facility, relying on the dealer to provide parts within a maximum 24 hours. Purchasers of larger machines were typically very sophisticated and kept detailed records of productivity (tons moved per hour or per $) and reliability. Parts and machine reliability were crucial since, unlike the smaller bulldozers, these were used intensively (up to 24 hours per day). Replacement parts represented 30% of the sales and 50% of the CAT dealer&#39;s profit.” You feel relieved and say…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"match cat price\" role=\"link\" tabindex=\"0\">We should follow a similar marketing strategy to CAT to get large contractors</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should differentiate ourselves from CAT\" role=\"link\" tabindex=\"0\">We should differentiate ourselves from CAT</a>\n</my_button>",
		'passages': {
		},
	},
	'We should differentiate ourselves from CAT': {
		'text': "<p align=\"justify\">\n“Actually we have built a good reputation in our market.” Kelly smiles as she continues “Our machines are highly regarded and our distribution network is seen as second only to Caterpillar. While CAT stressed reliability and parts availability, Our strategy have been built on providing superior customer benefits via innovation and technical improvement. Each of our new machines have been introduced with features new to the market.” You interrupt Kelly as you ask “What about the JD 750?” She takes a deep breath and explains “Well, the JD 750 followed this strategy being the first with fully automatic dual path hydrostatic drive. This eliminated the need for the operator to change gear in operation and significantly improved manoeuvrability and control over speed and power. Independent experts had found that the JD 750 surpassed the productivity of the D5 by 10% - 15% and matched the D6.” You smile as you hear this information and say…\n</p>\n\n<p><img src = \"image_9.jpg\"></p>\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should benefit from the first mover advantage\" role=\"link\" tabindex=\"0\">We should benefit from the first mover advantage</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should try the JD 750 first and postpone the JD 850 for now\" role=\"link\" tabindex=\"0\">We should try the JD 750 first and postpone the JD 850 for now</a>\n</my_button>",
		'passages': {
		},
	},
	'We should try the JD 750 first and postpone the JD 850 for now': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“So we should focus all our efforts on launching the JD 750 for now and stop all efforts regarding the JD 850??” Kelly asks. “For the time being yes. We need to be a little bit cautious and calculate the risks carefully for the JD 850. This way we would be able to test the market first with the JD 750 and if it shows to be promising, then we should launch the JD 850” You explain as Kelly looks pleased to hear that. “Fair enough” She says and then continues “I will talk to the executives and try to get things started as soon as possible. I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Exit\" role=\"link\" tabindex=\"0\">Exit</a>\n</my_button>",
		'passages': {
		},
	},
	'Exit': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations, launched the JD 750 and postponed the JD 850 for now. Our initial indicators are so promising as we have already generated a huge amount of sales. The executives really appreciated your efforts as this seem to be a game changer for us. However, some insights indicate that Terex are copying our JD 750 and will try to launch it as soon as possible. Although this will not affect our sales for the JD 750 since we seem to be the market leader now, it may affect future sales for 850 as we won’t be able to launch it soon since we postponed all our efforts in favor of the JD 750…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. This was a good decision, but maybe its long-term implications are not as good as its short-term ones.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'We should benefit from the first mover advantage': {
		'text': "<p align=\"justify\">\n“Well, that’s why we need to launch soon” Kelly explains as she continues to say “We have invested $16m over 10 years to develop the JD 750 and 850, a further $50m had gone on tools and equipment. The direct costs of the JD 750 were around $35,000. Both undercarriage parts and the hydro- static drives were bought in. Suppliers were not limited to selling only to us and we had little patent protection. Terex was known to be testing a bulldozer with a hydrostatic transmission but our engineers estimated that it would take CAT five years to engineer and tool for hydrostatic transmission. Because we bought non-exclusive parts, our dealers faced strong competition in the after market. CAT, on the other hand, changed its parts frequently to make it difficult for them to be copied.” You listen carefully and then say…\n</p>\n\n<p><img src = \"image_10.jpg\"></p>\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should charge a premium price based on costs incurred\" role=\"link\" tabindex=\"0\">We should charge a premium price based on costs incurred</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should consider service charges as well\" role=\"link\" tabindex=\"0\">We should consider service charges as well</a>\n</my_button>",
		'passages': {
		},
	},
	'We should charge a premium price based on costs incurred': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“You think we should focus on the machine price and charge a premium for the one time purchase?” Kelly questions you. “Yes! We should try to maximize our profits relative to the costs incurred for each machine.” You explain. “Fair enough” She says and then continues “I will talk to the executives and try to get things started as soon as possible. I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Go home\" role=\"link\" tabindex=\"0\">Go home</a>\n</my_button>",
		'passages': {
		},
	},
	'Go home': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations, launched the JD 750 at a $75,000. Our initial indicators are so promising as we have already generated a huge amount of sales due to our differentiation strategy and targeting large contractors. The executives really appreciated your efforts as this seem to be a game changer for us. However, I think we should have thought about after sale service charges since they contribute to huge amount of sales and we are not making any profit out of them at the moment. I think this definetly a missed opportunity…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. This was a good decision, but maybe its long-term implications are not as good as its short-term ones.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'We should consider service charges as well': {
		'text': "<p align=\"justify\">\n&quot;That is an important aspect as you know that our executives&#39; most difficult problem is determining what price to charge.” Kelly illustrates “CAT&#39;s D5 sold at $60,000 basic. This was, of course, only part of the cost to the buyer. The stress and tough working conditions for the larger machines meant that on average over a life of 10,000 operating hours, a bulldozer used parts and service equivalent to 90% of its purchase price and fuel equivalent to 5%.” She pauses for a second and asks “So what do you think we should do?”\n</p>\n\n<p><img src = \"image_11.jpg\"></p>\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should charge a premium price by promoting our technical superiority and services excellence\" role=\"link\" tabindex=\"0\">We should charge a premium price by promoting our technical superiority and services excellence</a>\n</my_button>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"We should charge a premium price internationally and match CAT’s price locally\" role=\"link\" tabindex=\"0\">We should charge a premium price internationally and match CAT’s price locally</a>\n</my_button>",
		'passages': {
		},
	},
	'We should charge a premium price internationally and match CAT’s price locally': {
		'text': "<p><img src = \"image_01.jpg\"></p>\n<p align=\"justify\">\n“Oh! You think we should not exceed CAT’s price locally?” Kelly wonders. “No, I think it would be tough to beat them in their own game. So it is less risky to just match their price at least locally and maybe exceed it globally.” You explain. “Okay, I will talk to the executives and try to get things started as soon as possible since we are in the process of launching The JD 750. I will keep you informed about how it goes.” She stands up and departs the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend…\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Get out\" role=\"link\" tabindex=\"0\">Get out</a>\n</my_button>",
		'passages': {
		},
	},
	'Get out': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We followed your recommendations and priced the JD 750 at $60,500 close to CAT’s D5 and at $80,000 globally. We have already generated some descent revenues from multiple sales. However, the initial indicators seem to show that we are not going to achieve our targets since most of the customers will hesitate to switch to ours since they are already familiar with CAT machines and our price did not reflect our technical superiority or differences. Internationally we are not so well either as it was the case before. Some global clients were even irritated by the huge price differences. I guess pricing it higher at least locally would have gained our clients’ confidence and even generated more sales…\nAnyway, thanks for your help!\nKelly”\nYou close the email and start thinking about what you read. Maybe this was not the best decision after all.\n</p>\n\n<my_button>\nTRY AGAIN!\n</my_button>",
		'passages': {
		},
	},
	'We should charge a premium price by promoting our technical superiority and services excellence': {
		'text': "<p><img src = \"image_12.jpg\"></p>\n<p align=\"justify\">\n“Fantastic! I will start implementing your recommendations as soon as I get approval from our executives.” Kelly says as she start packing her things. “Don’t worry! We will do our best here.” You respond. “Great! I will keep you informed.” She says while leaving the office. “Sure, have a nice weekend!” You say as she leaves. You turn off your pc and prepare to leave the office. This is going to be a long weekend.\n</p>\n\n<my_button>\n<a class=\"squiffy-link link-section\" data-section=\"Leave the office!\" role=\"link\" tabindex=\"0\">Leave the office!</a>\n</my_button>",
		'passages': {
		},
	},
	'Leave the office!': {
		'text': "<center><font size=\"7\" face=\"Laconic\" align = \"center\">\nMONDAY \n<br>\n</font></center>\n\n<p><img src = \"image_13.png\"></p>\n<p align=\"justify\">\nYou feel excited as you head back to the office after a refreshing weekend. As you enter the office, you notice an unread email. You open it and start reading:\n“We got the approval for implementing your fast mover strategy. Things are going pretty well. Our initial indicators are very promising, predicting huge market shares and even the possibility of dominating it with the JD 850 as we were able to completely differentiate ourselves from the competition and charge premium prices by promoting our technical excellence and utilizing outstanding services as well…\nThanks for your help!\nKelly”\nYou close the email and start thinking about what you read. This is a huge step for the company since this can be a game changer.\n</p>\n\n<my_button>\nWell Done!\n</my_button>",
		'passages': {
		},
	},
}
})();
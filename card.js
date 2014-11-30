var cards = (function () {
  var cards = {};

  var allData;

  // constants
  var EXAMPLE_PLACEHOLDER = '[term]',
    REPLACEMENT_REGEX = /\((\w+?)->(\w+?)\)/g;

  var default_rule_count = 3,
    default_example_count = 6;

  var currentState = 'getInput';


  function hashRuleExample(rule) {
    return JSON.stringify(rule);
  }

  function commitData(newData) {
    var updatedURL = window.location.protocol + "//"
                     + window.location.host + window.location.pathname
                     + '?data=' + encodeURIComponent(JSON.stringify(newData));
    window.history.pushState({path: updatedURL}, '', updatedURL);
  }

  function updateAllData() {
    function getValFromData(d) {
      return $(d).val();
    }

    var source_rules = d3.selectAll('.source_rule')[0].map(getValFromData),
      target_rules = d3.selectAll('.target_rule')[0].map(getValFromData),
      source_examples = d3.selectAll('.source_example')[0].map(getValFromData),
      target_examples = d3.selectAll('.target_example')[0].map(getValFromData),
      blank,
      rule_i,
      example_i;

    blank = {
      name: allData.name,
      rules: [],
      examples: [],
      exceptions: allData.exceptions,
      cardScores: allData.cardScores
    };

    for (rule_i = 0; rule_i < source_rules.length; rule_i++) {
      blank.rules.push({
        source: source_rules[rule_i],
        target: target_rules[rule_i]
      });
    }

    for (example_i = 0; example_i < source_examples.length; example_i++) {
      blank.examples.push({
        source: source_examples[example_i],
        target: target_examples[example_i]
      });
    }

    return blank;
  }

  function applyRuleToExample(rule, example) {

    var result,
      match,
      replace_this_string_len,
      could_be_a_match;

    if (example === '') {
      return '';
    }

    result = rule.replace(EXAMPLE_PLACEHOLDER, example);

    match = REPLACEMENT_REGEX.exec(result);
    if (match) {
      result = result.replace(REPLACEMENT_REGEX, '');

      // get the string right before it
      replace_this_string_len = match[1].length;

      could_be_a_match = result.substr(match.index - replace_this_string_len, replace_this_string_len);

      if (could_be_a_match === match[1]) {
        result = result.substr(0, match.index - replace_this_string_len)
          + match[2]
          + result.substr(match.index, result.length - 1);
      }
    }

    return result;
  }

  function enterException(box, full_data) {
    var resultBox, inputBox;

    resultBox = d3.select(box);
    resultBox.on('click', drawNextButton); // remove click event
    resultBox.text('');

    inputBox = resultBox.append('span');
    inputBox.append('input')
      .attr('value', full_data.text);
  }

  function updateExceptions() {
    d3.selectAll('tbody tr.example')
      .selectAll('td.result').selectAll('div').selectAll('input')
      .each(function (d) {
        allData.exceptions[hashRuleExample(d.data)] = $(this).val();
      });
  }

  function pairOffData(allData) {

    function createMatrixDataForType(type, data) {
      var isException, text;

      if (allData.exceptions.hasOwnProperty(hashRuleExample(data))) {
        isException = true;
        text = allData.exceptions[hashRuleExample(data)];
      } else {
        isException = false;
        text = applyRuleToExample(data.rule, data.example);
      }

      return {
        type: type,  // todo, data has and needs this, can we drop this one?
        text: text,
        is_exception: isException,
        data: data
      };
    }

    var result = [],
      example_i,
      rule_i,
      newList,
      current_rule,
      current_example,
      source_data,
      target_data;

    for (example_i = 0; example_i < allData.examples.length; example_i++) {
      newList = [];
      for (rule_i = 0; rule_i < allData.rules.length; rule_i++) {

        // meh, we could do this earlier, but it's just lookup
        current_rule = allData.rules[rule_i];
        current_example = allData.examples[example_i];

        source_data = {
          type: 'source',
          rule: current_rule.source,
          example: current_example.source
        };

        target_data = {
          type: 'target',
          rule: current_rule.target,
          example: current_example.target
        };

        newList.push({
          source: createMatrixDataForType('source', source_data),
          target: createMatrixDataForType('target', target_data),
          score: allData.cardScores[hashRuleExample(source_data)]
        });
      }
      result.push(newList);
    }

    return result;
  }

  function updateGrid() {
    var matrix,
      tr,
      td;

    updateExceptions();

    allData = updateAllData();
    matrix = pairOffData(allData);

    tr = d3.selectAll('tbody tr.example')
      .data(matrix);

    td = tr.selectAll('td.result')
      .data(function (d) {return d; });

    td.enter().append('td')
      .attr('class', 'result');

    // add td div
    td.selectAll('*').remove();

    td.selectAll('div')
      .data(function (d) {return [d.source, d.target]; })
      .enter()
      .append('div')
      .attr('class', function (d) {
        return d.type + (d.is_exception ? '_result' : '_result exception');
      })
      .text(function (d) {return d.text || '\u00A0'; })
      .on('click', function (d) {enterException(this, d); });

    td.exit().remove();

    commitData(allData);

  }

  function getDataFromURI() {
    // FIXME this is probably a terrible regex for this. 
    var match = /\?data=([\w%"']*)?/g.exec(window.location.search);

    if (!match) {
      return false;
    }

    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return false;
    }
  }

  function initAllData() {
    var URIdataInfo = getDataFromURI(),
      dataInfo,
      rule_i,
      example_i;

    if (URIdataInfo) {
      return URIdataInfo;
    }

    dataInfo = {
      name: "",
      rules: [],
      examples: [],
      exceptions: {},
      cardScores: {}
    };

    for (rule_i = 0; rule_i < default_rule_count; rule_i++) {
      dataInfo.rules.push({
        target: '[term]',
        source: '[term]'
      });
    }

    for (example_i = 0; example_i < default_example_count; example_i++) {
      dataInfo.examples.push({
        target: '',
        source: ''
      });
    }

    return dataInfo;
  }

  function attachRuleInput(cells) {

    cells.append('div')
      .append('input')
      .attr('value', function (d) {return d.source; })
      .attr('class', 'source_rule')
      .on('keyup', updateGrid);

    cells.append('div')
      .append('input')
      .attr('value', function (d) {return d.target; })
      .attr('class', 'target_rule')
      .on('keyup', updateGrid);

  }

  function addExampleInputs(tds) {

    tds.append('div')
      .append('input')
      .attr('value', function (d) {return d.source; })
      .attr('class', 'source_example')
      .on('keyup', updateGrid);

    tds.append('div')
      .append('input')
      .attr('value', function (d) {return d.target; })
      .attr('class', 'target_example')
      .on('keyup', updateGrid);
  }

  function computeScore(cardScores) {
    return d3.sum(cardScores) / cardScores.length;
  }

  function clearMatrix(matrix) {
    return matrix.filter(function (d) {
      return (d[0].source.data.example !== "");
    });
  }

  function drawNextButton() {
    var matrix, tbody;

    d3.select('div#grid').selectAll('*').remove();

    matrix = clearMatrix(pairOffData(allData));

    tbody = d3.select('div#grid')
      .append('table')
      .append('tbody');

    tbody.selectAll('tr')
      .data(matrix)
      .enter()
      .append('tr')
      .selectAll('td')
      .data(function (d) {return d; })
      .enter()
      .append('td')
      .attr('class', 'final_score')
      .attr('bgcolor', function (d) {
        return d3.hsl('#33F')
          .brighter(computeScore(d.score))
          .toString();
      })
      .selectAll('div')
      .data(function (d) {return [d.source, d.target]; })
      .enter()
      .append('div')
      .text(function (d) {return d.text; });
  }

  function studyTime(cards) {
    var card_i = 0;

    function scoreCard(card, score) {
      var cardData = card.source.data;

      if (!allData.cardScores.hasOwnProperty(hashRuleExample(cardData))) {
        allData.cardScores[hashRuleExample(cardData)] = [];
      }

      allData.cardScores[hashRuleExample(cardData)].push(score);
      commitData(allData);

      card_i++;

      if (card_i < cards.length) {
        drawCard(cards[card_i]);
      } else {
        changeState();
      }
    }

    function flipCard(card) {
      d3.select('div#feels').selectAll('*').remove();
      d3.select('div#card').selectAll('*').remove();


      d3.select('div#card')
        .attr('class', 'study_source')
        .text(card.source.text);

      d3.select('div#card')
        .append('div')
        .attr('class', 'small_study_target')
        .text(card.target.text);

      d3.select('div#feels')
        .append('button')
        .text(':(')
        .on('click', function () {
          scoreCard(card, 0);
        });

      d3.select('div#feels')
        .append('button')
        .text(':D')
        .on('click', function () {
          scoreCard(card, 1);
        });
    }

    function drawCard(card) {
      d3.select('div#feels').selectAll('*').remove();

      d3.select('div#card')
        .attr('class', 'study_target')
        .text(card.target.text);

      d3.select('div#feels')
        .append('button')
        .attr('class', 'flip_it')
        .text('flip it')
        .on('click', function () {
          flipCard(card);
        });
    }

    d3.select('div#grid')
      .append('div')
      .attr('id', 'feels');

    d3.select('div#grid')
      .append('div')
      .attr('id', 'card');

    drawCard(cards[card_i]);
  }

  function drawGrid() {
    function makeHeader(header) {
      var th = header.selectAll('th.rule')
        .data(allData.rules)
        .enter()
        .append('th')
        .attr('class', 'rule');

      attachRuleInput(th);
    }

    function makeRows(tbody) {
      var rows, tds;

      rows = tbody.selectAll('tr.example')
        .data(allData.examples)
        .enter()
        .append('tr')
        .attr('class', 'example');

      tds = rows.append('td');

      addExampleInputs(tds);
    }

    function addExamplePlusMinus() {
      var tr, cell;

      tr = d3.select('tbody')
        .append('tr');
      tr.attr('class', 'plusMinus');

      cell = tr.append('td');
      cell.selectAll('*').remove();
      cell.append('span')
        .text('-');
      cell.append('span')
        .text('+')
        .on('click', function () {
          allData.examples.push({
            target: '',
            source: ''
          });

          drawGrid();
          updateGrid();
        });
    }

    function addRulePlusMinus() {
      var cell = d3.select('#grid thead')
        .append('th')
        .attr('class', 'plusMinus');

      cell.selectAll('*').remove();

      cell.append('div')
        .text('-');

      cell.append('div')
        .text('+')
        .on('click', function () {
          allData.rules.push({
            target: '[term]',
            source: '[term]'
          });

          drawGrid();
          updateGrid();
        });
    }

    function appendPlusMinusGrid() {
      d3.selectAll('.plusMinus').remove();
      addExamplePlusMinus();
      addRulePlusMinus();
    }

    makeHeader(d3.select('#grid thead'));
    makeRows(d3.select('#grid tbody'));
    appendPlusMinusGrid();
  }

  function checkIfCellIsEmpty(cell) {
    return (!(cell.source.text === "" && cell.target.text === ""));
  }

  function getInputToTest() {
    var matrix, cards;

    allData = updateAllData();

    d3.select('div#grid').selectAll('*').remove();
    updateExceptions();

    matrix = pairOffData(allData);

    cards = matrix.reduce(function (a, b) {
      return a.concat(b);
    });

    cards = cards.filter(checkIfCellIsEmpty);
    cards = d3.shuffle(cards);
    studyTime(cards);

    return 'drawScoreGrid';
  }

  function changeState() {
    var transitionFunctions = {
      'getInput': getInputToTest,
      'drawScoreGrid': drawNextButton,
    };

    currentState = transitionFunctions[currentState]();
  }

  function setupButton() {
    d3.select('button#next')
      .text('Wheee, let\'s go!')
      .on('click', changeState);
  }

  function createNewGrid() {
    
  }

  function drawGridSelector() {
    d3.select('#gridName')
      .attr('value', allData.name)
      .on('keyup', function () {
        allData.name = $(this).val();
        commitData(allData);
      });

    d3.select('#makeNewGrid')
      .on('click', function () {
        createNewGrid();
      })
  }

  cards.main = function () {
    allData = initAllData();

    drawGridSelector();
    // draw the first th
    d3.select('#grid thead').insert('th');
    drawGrid();
    updateGrid();
    setupButton();
  }

  return cards;
}());
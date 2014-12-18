var cards = (function () {
  var cards = {};

  // constants
  var default_rule_count = 3,
      default_example_count = 6;

  // state
  var currentState = 'getInput',
      currentGridIndex = 0;


  // loading data
  function commitData() {
    var newData = cardDataStore.data.data;

    var updatedURL = window.location.protocol + "//"
                     + window.location.host + window.location.pathname
                     + '?data=' + encodeURIComponent(JSON.stringify(newData));
    window.history.pushState({path: updatedURL}, '', updatedURL);
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

  // grid interactions
  function updateAllData() {
    function getValsForClass(classSelector) {
      return d3.selectAll(classSelector)[0].map(function (d) {return d.value;})
    }

    cardDataStore.data.updateRules(
      currentGridIndex, 
      getValsForClass('.source_rule'), 
      getValsForClass('.target_rule')
    );

    cardDataStore.data.updateExamples(
      currentGridIndex, 
      getValsForClass('.source_example'), 
      getValsForClass('.target_example')
    );
  }

  function enterException(box, full_data) {
    var resultBox, inputBox;

    resultBox = d3.select(box);
    resultBox.on('click', drawFinalResultsGrid); // remove click event
    resultBox.text('');

    inputBox = resultBox.append('span');
    inputBox.append('input')
      .attr('value', full_data.text);
  }

  function updateExceptions() {
    d3.selectAll('tbody tr.example')
      .selectAll('td.result').selectAll('div').selectAll('input')
      .each(function (d) {
        cardDataStore.updateException(currentGridIndex, d.data, this.value);
      });
  }

  function updateGrid() {
    var matrix, tr, td;

    updateExceptions();

    updateAllData();
    matrix = cardDataStore.pairOffData(currentGridIndex);

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

    commitData();
  }

  function drawGrid() {

    function addExampleInputs(tds) {
      tds.selectAll('*').remove();

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

    function attachRuleInput(cells) {

      cells.selectAll('*').remove();

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

    function makeHeader(header) {
      var th = header.selectAll('th.rule')
        .data(cardDataStore.data.getData(currentGridIndex).rules);

      th.enter()
        .append('th')
        .attr('class', 'rule');

      th.exit().remove();

      attachRuleInput(th);
    }

    function makeRows(tbody) {
      var rows, tds;

      rows = tbody.selectAll('tr.example')
        .data(cardDataStore.data.getData(currentGridIndex).examples);

      rows.enter()
        .append('tr')
        .attr('class', 'example');

      rows.exit().remove();

      rows.selectAll("*").remove();

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
          cardDataStore.data.addBlankExample(currentGridIndex);
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
          cardDataStore.data.addBlankRule(currentGridIndex)
          drawGrid();
          updateGrid();
        });
    }

    function appendPlusMinusGrid() {
      d3.selectAll('.plusMinus').remove();
      addExamplePlusMinus();
      addRulePlusMinus();
    }

    document.getElementById('gridName').value = cardDataStore.data.getGridName(currentGridIndex);

    makeHeader(d3.select('#grid thead'));
    makeRows(d3.select('#grid tbody'));
    appendPlusMinusGrid();
  }

  function createNewGrid() {
    cardDataStore.data.addGrid();

    currentGridIndex = cardDataStore.data.gridCount() - 1; // move to this new
    updateArrows();
    drawGrid();
    updateGrid();
  }

  function drawGridSelector() {
    d3.select('#gridName')
      .on('keyup', function () {
        cardDataStore.data.setGridName(currentGridIndex, this.value);
        commitData();
      });

    d3.select('#makeNewGrid')
      .on('click', function () {
        createNewGrid();
        commitData();
      });

    d3.select('#choosePrevGrid')
      .on('click', function () {
        currentGridIndex--;
        updateArrows();
        drawGrid();
        updateGrid();
      });

    d3.select('#chooseNextGrid')
      .on('click', function () {
        currentGridIndex++;
        updateArrows();
        drawGrid();
        updateGrid();
      });

    updateArrows();
  }

  function updateArrows() {
    var is_at_last_grid = (currentGridIndex === cardDataStore.data.gridCount() - 1),
      is_at_first_grid = (currentGridIndex === 0);

    document.getElementById('choosePrevGrid').disabled = is_at_first_grid;
    document.getElementById('chooseNextGrid').disabled = is_at_last_grid;
  }


  // study time
  function studyTime(cardList) {
    var card_i = 0;

    function scoreCard(card, score) {
      var card_data = card.source.data;
      cardDataStore.data.updateCardScore(card_data, score)

      commitData();

      card_i++;

      if (card_i < cardList.length) {
        drawCard(cardList[card_i]);
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


    drawCard(cardList[card_i]);
  }

  function getInputToTest() {
    var flashCards;

    updateAllData();
    updateExceptions();  // FIXME, why is this here?

    d3.select('div#grid').selectAll('*').remove();

    flashCards = cardDataStore.getAllCards();
    flashCards = d3.shuffle(flashCards);
    studyTime(flashCards);

    return 'drawScoreGrid';
  }


  // final results
  function drawFinalResultsGrid() {
    var divs, tbody, matrices;

    function computeScore(cardScores) {
      return d3.sum(cardScores) / cardScores.length;
    }

    d3.select('div#grid').selectAll('*').remove();

    matrices = cardDataStore.getCleanMatrix();

    divs = d3.select('div#grid')
      .selectAll('div.scoreResults')
      .data(matrices)
      .enter()
      .append('div')
      .attr('class', 'scoreResults')
      .text(function (d) {return d.name});

    tbody = divs.append('table').append('tbody');

    tbody.selectAll('tr')
      .data(function (d) {return d.data; })
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


  // handle state
  function setupButton() {
    d3.select('button#next')
      .text('Wheee, let\'s go!')
      .on('click', changeState);
  }

  function changeState() {
    var transitionFunctions = {
      'getInput': getInputToTest,
      'drawScoreGrid': drawFinalResultsGrid,
    };

    currentState = transitionFunctions[currentState]();
  }

  cards.main = function () {
    cardDataStore = CardLogic(
      default_rule_count, 
      default_example_count, 
      getDataFromURI()
    );

    drawGridSelector();
    // draw the first th
    d3.select('#grid thead').insert('th');
    drawGrid();
    updateGrid();
    setupButton();
  }

  return cards;
}());
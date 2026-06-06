(function() {
  'use strict';

  const NATIVE_FETCH = window.fetch;
  const NATIVE_XHR_OPEN = window.XMLHttpRequest.prototype.open;
  const NATIVE_XHR_SEND = window.XMLHttpRequest.prototype.send;

  function postToContent(msg) {
    window.postMessage({ source: 'aviator-trader-inject', ...msg }, '*');
  }

  function log(msg) {
    console.log('[AviatorTrader Inject]', msg);
    postToContent({ type: 'log', text: '[Inject] ' + msg });
  }

  function processData(data, url) {
    if (!data || typeof data !== 'object') return;

    let items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.rows && Array.isArray(data.rows)) {
      items = data.rows;
    } else if (data.historico && Array.isArray(data.historico)) {
      items = data.historico;
    } else if (data.records && Array.isArray(data.records)) {
      items = data.records;
    }

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      let multiplier = parseFloat(
        item.multiplicador || item.multiplier || item.mult || 
        item.coefficient || item.valor || item.value || 
        item.crash_point || item.crashPoint || item.result ||
        item.odds || item.payout
      );
      
      let round = item.rodada || item.round || item.round_id || 
                  item.game_id || item.id || item.gameId || item.entry || '';
      
      let timestamp = item.timestamp || item.time || item.createdAt || 
                      item.created_at || item.horario || item.hora || '';

      if (!isNaN(multiplier) && multiplier > 0 && multiplier < 10000) {
        postToContent({
          type: 'game_data',
          payload: {
            multiplier,
            round: String(round),
            timestamp,
            source: 'tipminer-inject',
            url: url.substring(0, 100)
          }
        });
      }
    }

    if (items.length === 0 && Object.keys(data).length > 0) {
      let multiplier = parseFloat(
        data.multiplicador || data.multiplier || data.mult || 
        data.coefficient || data.valor || data.value || 
        data.crash_point || data.crashPoint || data.result
      );
      
      let round = data.rodada || data.round || data.round_id || 
                  data.game_id || data.id || data.gameId || '';
      
      if (!isNaN(multiplier) && multiplier > 0 && multiplier < 10000) {
        postToContent({
          type: 'game_data',
          payload: {
            multiplier,
            round: String(round),
            timestamp: data.timestamp || data.time || data.createdAt || data.horario || '',
            source: 'tipminer-inject',
            url: url.substring(0, 100)
          }
        });
      }
    }
  }

  function interceptFetch() {
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : (input.url || '');
      
      return NATIVE_FETCH.apply(this, arguments).then(response => {
        const cloned = response.clone();
        cloned.text().then(body => {
          try {
            const json = JSON.parse(body);
            processData(json, url);
          } catch(e) {}
        }).catch(() => {});
        return response;
      });
    };
  }

  function interceptXHR() {
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._aviatorUrl = url;
      return NATIVE_XHR_OPEN.apply(this, [method, url, ...rest]);
    };

    window.XMLHttpRequest.prototype.send = function(...args) {
      const url = this._aviatorUrl;
      const origOnReady = this.onreadystatechange;

      this.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200 && url) {
          try {
            const data = JSON.parse(this.responseText);
            processData(data, url);
          } catch(e) {}
        }
        if (origOnReady) origOnReady.apply(this, arguments);
      };

      return NATIVE_XHR_SEND.apply(this, args);
    };
  }

  interceptFetch();
  interceptXHR();

  log('Ativo - interceptando todas as requisições');
  postToContent({ type: 'inject_loaded' });
})();

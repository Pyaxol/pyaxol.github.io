// 加载静态资源并实现题目生成与统一检查
(function(){
  const filesToLoad = ['letterlib.txt','redsentences.txt','translated.txt'];
  let letterlib=[], redsentences=[], translated=[];

  function fetchText(path){
    return fetch(path).then(r=>{ if(!r.ok) throw new Error(path+ ' load failed'); return r.text() })
  }

  // 读取文本资源（每行非空）
  function loadResources(){
    return Promise.all(filesToLoad.map(f=>fetchText(f))).then(texts=>{
      letterlib = texts[0].split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      redsentences = texts[1].split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      translated = texts[2].split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    })
  }

  function pickRandom(arr,n){
    const copy = arr.map((v,i)=>i);
    const res = [];
    for(let i=0;i<Math.min(n,copy.length);i++){
      const idx = Math.floor(Math.random()*copy.length);
      res.push(copy.splice(idx,1)[0]);
    }
    return res;
  }

  function parseLetterEntry(line){
    const parts = line.split('|');
    if(parts.length<3) return null;
    const letter = parts[0].trim();
    const typ = parts[1].trim();
    const sentence = parts.slice(2).join('|').trim();
    const match = sentence.match(/\[(.*?)\]/);
    if(!match) return null;
    const ans = match[1];
    const problem = sentence.replace(/\[(.*?)\]/g,'_____');
    return {letter,typ,problem,ans};
  }

  // UI helpers
  const $ = id=>document.getElementById(id);

  function generate(){
    const letn = parseInt($('letn').value)||0;
    const senn = parseInt($('senn').value)||0;
    // letters
    const parsed = letterlib.map(parseLetterEntry).filter(Boolean);
    if(letn>parsed.length){ alert('请求的字母题超过可用题目数量'); return }
    const letterIndices = pickRandom(parsed, letn);
    const letterPool = letterIndices.map(i=>({idx:i,entry:parsed[i]}));
    // shuffle
    letterPool.sort(()=>Math.random()-0.5);

    // sentences
    if(senn>redsentences.length){ alert('请求的句子题超过可用题目数量'); return }
    const sentIndices = pickRandom(redsentences, senn);

    // render wordbank — 只显示本次生成题目用到的词项
    const wb = letterPool.map(item=> item.entry.letter + '(' + item.entry.typ + ')');
    $('wordbankList').textContent = wb.length? wb.join(', ') : '（未生成）';

    // clear render areas
    const problemsEl = $('problems'); problemsEl.innerHTML='';
    const redbankList = $('redbankList'); redbankList.innerHTML='';
    // letters problems
    letterPool.forEach((item,idx)=>{
      const div = document.createElement('div'); div.className='problem';
      const p = document.createElement('div'); p.className='prompt'; p.textContent = (idx+1)+'. '+item.entry.problem;
      const input = document.createElement('input'); input.type='text'; input.dataset.type='letter'; input.dataset.answer=item.entry.ans; input.placeholder='在此输入答案';
      div.appendChild(p); div.appendChild(input);
      problemsEl.appendChild(div);
    })

    // sentence problems — 放到单独的 redbank 中，多个空生成多个输入框
    sentIndices.forEach((i,si)=>{
      const raw = redsentences[i];
      const regex = /\[(.*?)\]/g;
      const parts = raw.split(regex); // splits into [text, ans, text, ans, ...]
      // count answers (every odd index)
      const answers = [];
      for(let k=1;k<parts.length;k+=2) answers.push(parts[k]);
      const div = document.createElement('div'); div.className='problem';
      const p = document.createElement('div'); p.className='prompt';
      // show index and number of blanks
      const header = document.createElement('span'); header.textContent = (si+1)+'. ';
      p.appendChild(header);
      // build prompt with underscore placeholders; inputs go below
      for(let j=0;j<parts.length;j++){
        if(j%2===0){ // text
          const tn = document.createTextNode(parts[j].replace(/\s+/g,' '));
          p.appendChild(tn);
        } else { // answer placeholder -> underscore
          const underscore = document.createTextNode(' ____ ');
          p.appendChild(underscore);
        }
      }
      // inputs row below the prompt
      const inputsRow = document.createElement('div'); inputsRow.style.marginTop='6px';
      for(let j=1;j<parts.length;j+=2){
        const input = document.createElement('input'); input.type='text'; input.className='sentence-input'; input.dataset.type='sentence'; input.dataset.answer = parts[j]; input.placeholder=''; input.style.marginRight='8px';
        inputsRow.appendChild(input);
        const ca = document.createElement('span'); ca.className='correctAnswer'; ca.style.marginLeft='6px'; ca.style.display='none'; inputsRow.appendChild(ca);
      }
      const t = document.createElement('div'); t.className='translation'; t.textContent = (translated[i]||'');
      // show translation first (without label), then prompt and inputs
      if(t.textContent) div.appendChild(t);
      div.appendChild(p); div.appendChild(inputsRow);
      redbankList.appendChild(div);
    })

    $('score').textContent='';
  }

  function checkAll(){
    const inputs = Array.from(document.querySelectorAll('#problems input[type=text], #redbank input[type=text]'));
    if(inputs.length===0){ alert('还没有生成题目'); return }
    // evaluate each input individually and show its correct answer next to it
    inputs.forEach(inp=>{
      const ans = inp.dataset.answer||'';
      const user = (inp.value||'').trim();
      const correct = user === ans;
      inp.classList.remove('ok','bad');
      if(correct){
        inp.classList.add('ok');
      } else {
        inp.classList.add('bad');
      }
      // show per-input correct answer span (insert right after the input)
      let ca = inp.nextElementSibling;
      if(!(ca && ca.classList && ca.classList.contains('correctAnswer'))){
        ca = document.createElement('span'); ca.className='correctAnswer'; ca.style.marginLeft='6px';
        inp.parentNode.insertBefore(ca, inp.nextSibling);
      }
      ca.style.display = 'inline';
      ca.textContent = '正确答案：' + ans;
    })
  }

  // 初始化事件绑定
  document.addEventListener('DOMContentLoaded', ()=>{
    loadResources().catch(err=>{
      alert('加载资源失败，请确保 letterlib.txt、redsentences.txt、translated.txt 与页面同目录可访问。\n'+err.message);
    })
    $('genBtn').addEventListener('click', generate);
    $('checkBtn').addEventListener('click', checkAll);
  })

})();

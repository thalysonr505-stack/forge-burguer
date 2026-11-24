(() => {
  const languages=[{code:"pt-BR",google:"pt",label:"Português (Brasil)",flag:"🇧🇷"},{code:"pt-PT",google:"pt",label:"Português (Portugal)",flag:"🇵🇹"},{code:"en",google:"en",label:"English",flag:"🇬🇧"},{code:"es",google:"es",label:"Español",flag:"🇪🇸"},{code:"fr",google:"fr",label:"Français",flag:"🇫🇷"},{code:"de",google:"de",label:"Deutsch",flag:"🇩🇪"},{code:"it",google:"it",label:"Italiano",flag:"🇮🇹"}];
  const root=document.createElement("div");root.className="forge-translator";
  root.innerHTML='<button class="forge-translate-trigger" type="button" aria-expanded="false" aria-controls="forge-language-menu"><span aria-hidden="true">文</span><span>TRADUZIR</span><span class="forge-translate-chevron">▾</span></button><div class="forge-language-menu" id="forge-language-menu" hidden><p>ESCOLHA O IDIOMA</p><div class="forge-language-options"></div><button class="forge-language-reset" type="button">Voltar ao idioma original</button></div><div id="google_translate_element" aria-hidden="true"></div>';
  document.body.appendChild(root);
  const trigger=root.querySelector(".forge-translate-trigger"),menu=root.querySelector(".forge-language-menu"),options=root.querySelector(".forge-language-options");
  const saved=localStorage.getItem("forge-language")||"pt-BR";
  const label=trigger.querySelector("span:nth-child(2)");
  function closeMenu(){menu.hidden=true;trigger.setAttribute("aria-expanded","false")}
  function selectLanguage(language){
    localStorage.setItem("forge-language",language.code);document.documentElement.lang=language.code;
    const select=document.querySelector(".goog-te-combo");
    if(!select){window.forgePendingLanguage=language.google;loadGoogleTranslate()}
    else if(language.google!=="pt"){select.value=language.google;select.dispatchEvent(new Event("change"))}
    else {select.value="";select.dispatchEvent(new Event("change"))}
    label.textContent=language.code==="pt-BR"?"TRADUZIR":language.label.toUpperCase();closeMenu();
  }
  languages.forEach(language=>{const b=document.createElement("button");b.type="button";b.className="forge-language-option";b.innerHTML='<span class="forge-language-flag">'+language.flag+'</span><span>'+language.label+'</span>';b.addEventListener("click",()=>selectLanguage(language));options.appendChild(b)});
  trigger.addEventListener("click",()=>{menu.hidden? (menu.hidden=false,trigger.setAttribute("aria-expanded","true")):closeMenu()});
  root.querySelector(".forge-language-reset").addEventListener("click",()=>selectLanguage(languages[0]));
  document.addEventListener("click",e=>{if(!root.contains(e.target))closeMenu()});
  window.googleTranslateElementInit=function(){new google.translate.TranslateElement({pageLanguage:"en",includedLanguages:"pt,es,fr,de,it",autoDisplay:false},"google_translate_element");const pending=window.forgePendingLanguage;if(pending){const s=document.querySelector(".goog-te-combo");if(s){s.value=pending;s.dispatchEvent(new Event("change"))}}};
  let loaded=false;
  function loadGoogleTranslate(){if(loaded)return;loaded=true;const s=document.createElement("script");s.src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";s.async=true;s.onerror=()=>{loaded=false};document.head.appendChild(s)}
  {const chosen=languages.find(x=>x.code===saved)||languages[0];document.documentElement.lang=chosen.code;if(chosen.code!=="pt-BR")label.textContent=chosen.label.toUpperCase();window.forgePendingLanguage=chosen.google;}
  loadGoogleTranslate();
})();
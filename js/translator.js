(() => {
  const languages=[
    {code:"pt-BR",google:"pt",label:"Português (Brasil)",flag:"🇧🇷"},
    {code:"en",google:"en",label:"English",flag:"🇬🇧"},
    {code:"es",google:"es",label:"Español",flag:"🇪🇸"},
    {code:"fr",google:"fr",label:"Français",flag:"🇫🇷"},
    {code:"de",google:"de",label:"Deutsch",flag:"🇩🇪"},
    {code:"it",google:"it",label:"Italiano",flag:"🇮🇹"}
  ];
  const root=document.createElement("div");
  root.className="forge-translator";
  root.innerHTML='<button class="forge-translate-trigger" type="button" aria-expanded="false" aria-controls="forge-language-menu"><span aria-hidden="true">文</span><span>IDIOMA</span><span class="forge-translate-chevron">▾</span></button><div class="forge-language-menu" id="forge-language-menu" hidden><p>ESCOLHA O IDIOMA</p><div class="forge-language-options"></div><button class="forge-language-reset" type="button">Voltar ao idioma original</button></div><div id="google_translate_element" aria-hidden="true"></div>';
  document.body.appendChild(root);
  const trigger=root.querySelector(".forge-translate-trigger");
  const menu=root.querySelector(".forge-language-menu");
  const options=root.querySelector(".forge-language-options");
  const label=trigger.querySelector("span:nth-child(2)");
  const cookieName="googtrans";
  let googleReady=false;
  let pendingLanguage=null;

  function setGoogleCookie(language){
    const value=language==="pt" ? "/pt/pt" : "/pt/"+language;
    document.cookie=cookieName+"="+value+";path=/;max-age="+(language==="pt"?0:31536000)+";SameSite=Lax";
  }
  function closeMenu(){menu.hidden=true;trigger.setAttribute("aria-expanded","false")}
  function applyToWidget(language){
    const select=document.querySelector(".goog-te-combo");
    if(!select)return false;
    select.value=language==="pt"?"":language;
    select.dispatchEvent(new Event("change",{bubbles:true}));
    return true;
  }
  function selectLanguage(language){
    localStorage.setItem("forge-language",language.code);
    document.documentElement.lang=language.code;
    label.textContent=language.code==="pt-BR"?"IDIOMA":language.label.toUpperCase();
    setGoogleCookie(language.google);
    pendingLanguage=language.google;
    closeMenu();
    if(googleReady && applyToWidget(language.google))return;
    window.location.reload();
  }
  languages.forEach(language=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="forge-language-option";
    button.innerHTML='<span class="forge-language-flag">'+language.flag+'</span><span>'+language.label+'</span>';
    button.addEventListener("click",()=>selectLanguage(language));
    options.appendChild(button);
  });
  trigger.addEventListener("click",()=>{
    menu.hidden ? (menu.hidden=false,trigger.setAttribute("aria-expanded","true")) : closeMenu();
  });
  root.querySelector(".forge-language-reset").addEventListener("click",()=>selectLanguage(languages[0]));
  document.addEventListener("click",event=>{if(!root.contains(event.target))closeMenu()});

  window.googleTranslateElementInit=function(){
    new google.translate.TranslateElement({
      pageLanguage:"pt",
      includedLanguages:"en,es,fr,de,it",
      autoDisplay:false,
      multilanguagePage:true
    },"google_translate_element");
    googleReady=true;
    const saved=languages.find(item=>item.code===(localStorage.getItem("forge-language")||"pt-BR"))||languages[0];
    pendingLanguage=saved.google;
    let attempts=0;
    const applyWhenReady=()=>{
      if(applyToWidget(pendingLanguage))return;
      if(++attempts<40)setTimeout(applyWhenReady,250);
    };
    applyWhenReady();
  };

  const saved=languages.find(item=>item.code===(localStorage.getItem("forge-language")||"pt-BR"))||languages[0];
  document.documentElement.lang=saved.code;
  if(saved.code!=="pt-BR")label.textContent=saved.label.toUpperCase();
  pendingLanguage=saved.google;
  const script=document.createElement("script");
  script.src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async=true;
  script.onerror=()=>{console.warn("FORGE: serviço de tradução indisponível neste momento.")};
  document.head.appendChild(script);
})();
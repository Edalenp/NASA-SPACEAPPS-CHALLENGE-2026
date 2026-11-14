import { useId } from 'react';
import type { VisualGuideId } from '../../data/guides';

/** Original layered SVG artwork: soft volume, neutral materials and independently animated instruments. */
export function MeasurementIllustration({ guide, step, description }: { guide: VisualGuideId; step: number; description: string }) {
  const uid = useId();
  const paint = (name: string) => `url(#${uid}-${name})`;
  const skin = { fill: paint('skin'), stroke: '#8eaa9b', strokeWidth: 1.2 };
  const device = { fill: paint('ceramic'), stroke: '#f9fcf8', strokeWidth: 1.4 };
  return <svg className="measurement-illustration" viewBox="0 0 640 420" role="img" aria-labelledby={`${uid}-title ${uid}-desc`}>
    <title id={`${uid}-title`}>{guide === 'pulse' ? 'Wrist pulse placement' : guide === 'temperature' ? 'Oral thermometer placement' : 'Fingertip oximeter placement'}</title>
    <desc id={`${uid}-desc`}>{description}</desc>
    <defs>
      <linearGradient id={`${uid}-field`} x2="0.7" y2="1"><stop stopColor="#eef3ed" /><stop offset="1" stopColor="#cad8ce" /></linearGradient>
      <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0.65" y2="1"><stop stopColor="#f3f7ed" /><stop offset="0.48" stopColor="#d7e4d6" /><stop offset="1" stopColor="#92ad9e" /></linearGradient>
      <linearGradient id={`${uid}-second-hand`} x1="0" y1="0" x2="0.4" y2="1"><stop stopColor="#fbfcf4" /><stop offset="0.48" stopColor="#d9e5d8" /><stop offset="1" stopColor="#9eb7aa" /></linearGradient>
      <linearGradient id={`${uid}-ceramic`} x1="0" y1="0" x2="0.4" y2="1"><stop stopColor="#fffef7" /><stop offset="0.52" stopColor="#e8eee5" /><stop offset="1" stopColor="#b9c9c0" /></linearGradient>
      <linearGradient id={`${uid}-probe`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffffff" /><stop offset="0.4" stopColor="#e9efeb" /><stop offset="1" stopColor="#91a69c" /></linearGradient>
      <linearGradient id={`${uid}-display`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#263d34" /><stop offset="1" stopColor="#415c4b" /></linearGradient>
      <radialGradient id={`${uid}-floor`}><stop stopColor="#526d5d" stopOpacity="0.24" /><stop offset="1" stopColor="#526d5d" stopOpacity="0" /></radialGradient>
      <filter id={`${uid}-shadow`} x="-30%" y="-40%" width="160%" height="200%"><feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#405c4a" floodOpacity="0.16" /></filter>
    </defs>
    <rect width="640" height="420" rx="20" fill={paint('field')} />
    <ellipse cx="320" cy="348" rx="273" ry="42" fill={paint('floor')} />
    <g strokeLinecap="round" strokeLinejoin="round">
      {guide === 'pulse' && <>
        <g filter={paint('shadow')}>
          <path {...skin} d="M218 386L218 305C200 286 190 263 187 240L149 196C139 184 136 174 146 165C156 156 166 161 176 173L210 207L210 117C210 93 238 93 238 117L238 180L244 75C245 50 274 50 274 75L274 174L281 61C282 37 311 37 311 61L311 177L320 87C322 64 350 65 350 87L350 211C350 252 331 277 318 301L318 386Z" />
          <path d="M210 226C239 223 253 250 246 271M250 212Q281 198 319 212M253 272Q279 254 316 266M227 298Q269 289 307 298M225 311Q267 304 306 311" fill="none" stroke="#789b87" strokeWidth="1.8" opacity="0.42" />
          <path d="M225 374V326M218 123V193M253 82L250 173M290 69L289 172M328 94L325 184" fill="none" stroke="#f9fcf3" strokeWidth="3" opacity="0.65" />
        </g>
        <g data-guide-motion="target"><circle cx="237" cy="306" r="25" fill="#f8fbf1" fillOpacity="0.45" stroke="#658875" strokeWidth="1.5" /><circle cx="237" cy="306" r="6" fill="#607f69" /></g>
        {step > 0 && <g data-guide-motion="place" filter={paint('shadow')}>
          <path d="M598 355L455 316C434 294 416 281 389 280L254 283C231 282 226 302 248 307L352 313L250 308C228 307 224 329 247 332L350 341C341 350 338 366 350 377C362 390 380 393 397 389L433 378L537 399Z" fill={paint('second-hand')} stroke="#99b3a2" strokeWidth="1.2" />
          <path d="M253 290L370 292M252 316L353 324M449 326L578 366" stroke="#fffef5" opacity="0.65" strokeWidth="3" fill="none" />
          <path d="M288 288L287 300M321 288L320 303M287 314L286 326M319 317L318 329M350 341Q374 329 390 345Q404 358 391 371M367 348Q359 358 372 368M409 339Q418 352 415 366" stroke="#8fae9a" opacity="0.65" strokeWidth="1.5" fill="none" />
        </g>}
        {step === 2 && <g data-guide-motion="reveal"><circle cx="538" cy="95" r="39" fill="#f3f7ee" fillOpacity="0.9" stroke="#b2c6b5" /><text x="538" y="102" textAnchor="middle" fill="#355441" fontSize="21" fontFamily="var(--vt-font-data)">60 s</text><path d="M538 50V42M529 42H547" fill="none" stroke="#789b84" strokeWidth="2" /></g>}
      </>}
      {guide === 'temperature' && <>
        {step > 0 && <g filter={paint('shadow')}>
          <path {...skin} d="M110 75C146 36 213 38 244 72C265 95 273 123 263 149C268 165 286 178 299 190C307 200 301 207 286 208L284 224C296 230 296 238 284 243L288 251C291 263 283 270 269 277C261 301 239 318 216 317L214 362C176 375 143 365 120 342L139 299C115 273 100 240 101 207C85 165 84 112 110 75Z" />
          <path d="M246 153Q254 149 260 154M285 225L267 229M287 251Q265 255 249 250M133 193C113 167 128 149 143 165C151 180 143 195 134 190" fill="none" stroke="#779a85" strokeWidth="2" opacity="0.55" />
          <ellipse cx="241" cy="242" rx="46" ry="28" fill="#edf4e7" opacity="0.88" />
          <path d="M213 239Q243 216 281 230L281 252Q249 268 213 248Z" fill="#749782" opacity="0.4" />
          <path d="M280 234C264 226 242 226 223 233C235 243 253 243 267 239" fill="#bfd1b9" stroke="#65866b" strokeWidth="1.5" />
          <path d="M216 249Q249 263 282 248" fill="none" stroke="#78977d" strokeWidth="1.3" />
          <path d="M116 82C147 50 193 47 225 68M114 214Q122 271 152 294" fill="none" stroke="#fffdf1" strokeWidth="3" opacity="0.6" />
        </g>}
        <g data-guide-motion="place"><g transform={step === 0 ? 'translate(-105 -65) scale(1.17)' : undefined} filter={paint('shadow')}>
          <path d="M235 254L465 275L470 265L237 246Z" fill={paint('probe')} stroke="#90a99b" />
          <path d="M235 254L248 255L249 247L237 246Z" fill="#708c7d" />
          <path d="M450 258L569 273Q591 278 588 297L584 321Q581 338 560 335L445 317Q429 314 432 296L435 274Q437 258 450 258Z" fill="#9aafa0" />
          <path {...device} d="M451 250L571 265Q592 269 589 288L586 311Q583 328 562 325L448 308Q433 305 436 288L439 267Q441 250 451 250Z" />
          <path d="M456 261L541 272L537 304L452 292Z" fill={paint('display')} stroke="#9bb2a1" />
          <text x="469" y="285" transform="rotate(8 469 285)" fill="#e7f2de" fontSize="17" fontFamily="var(--vt-font-data)">-- °C</text>
          <circle cx="565" cy="294" r="7" fill="#849e8e" /><circle cx="565" cy="292" r="6" fill="#c0d1c3" />
          <path d="M452 255L571 270" stroke="#fffef7" strokeWidth="2.5" fill="none" />
        </g></g>
        {step > 0 && <g data-guide-motion="target"><path d="M245 249L358 164H459" fill="none" stroke="#587864" strokeWidth="1.5" /><circle cx="245" cy="249" r="3" fill="#587864" /><text x="358" y="151" fill="#355441" fontSize="16" fontFamily="var(--vt-font-ui)">Under the tongue</text></g>}
        {step === 2 && <g data-guide-motion="reveal" fill="none" stroke="#6d907c" strokeWidth="2"><path d="M557 238Q580 238 594 254M560 225Q591 227 608 249" /></g>}
      </>}
      {guide === 'spo2' && <>
        <g filter={paint('shadow')}>
          <path {...skin} d="M40 266C108 267 143 239 182 216C208 198 239 185 275 185L441 183C467 182 485 194 482 210C479 226 460 230 439 230L305 230L280 248L369 243C393 241 406 249 407 262C409 277 394 286 372 287L302 290L355 293C378 293 388 305 383 319C378 333 360 338 340 336L283 333L324 344C342 350 342 365 331 375C320 384 303 380 289 375L243 359C219 350 195 344 180 331L40 326Z" />
          <path {...skin} d="M177 264C203 247 229 251 247 265L278 289C294 301 293 317 280 323C267 329 252 320 238 311L217 298C202 301 188 292 177 284" />
          <path d="M185 239Q204 242 215 254M281 249L268 260M303 289L292 294M282 333L261 337M198 281Q218 279 231 294" fill="none" stroke="#7c9c86" strokeWidth="1.6" opacity="0.45" />
          <path d="M51 275C108 276 145 252 183 228M310 193H437" fill="none" stroke="#fbfdf4" strokeWidth="3" opacity="0.7" />
          {step === 0 && <ellipse cx="454" cy="202" rx="16" ry="10" fill="#eaf1e4" stroke="#9db6a2" />}
        </g>
        {step === 0 ? <g data-guide-motion="target"><ellipse cx="454" cy="202" rx="29" ry="25" fill="none" stroke="#729b7d" strokeWidth="1.7" /></g> : <g data-guide-motion="place" filter={paint('shadow')}>
          <path d="M394 226H551V247Q551 269 529 269H417Q394 269 394 247Z" fill="#91aa9b" />
          <path {...device} d="M394 220H551V240Q551 260 529 260H417Q394 260 394 240Z" />
          <g data-guide-motion="jaw"><path d="M416 149H531Q554 149 554 174V205H393V174Q393 149 416 149Z" fill="#b0c4b6" /><path {...device} d="M415 142H528Q551 142 551 166V198H393V166Q393 142 415 142Z" />
            <rect x="419" y="154" width="105" height="31" rx="7" fill={paint('display')} stroke="#a1b7a6" />
            <text x="432" y="176" fill="#e9f3df" fontSize="16" fontFamily="var(--vt-font-data)">-- %  --</text>
            <path d="M417 146H526" stroke="#fffef7" strokeWidth="2.5" fill="none" />
          </g>
          <path d="M550 185Q564 188 564 212V237Q564 249 550 249" fill="none" stroke="#8ba490" strokeWidth="5" />
          <circle cx="547" cy="220" r="4" fill="#6d8e78" />
          {step === 2 && <g data-guide-motion="reveal"><path d="M429 132L417 120M471 130V113M512 132L523 120" fill="none" stroke="#719879" strokeWidth="2" /></g>}
        </g>}
      </>}
    </g>
  </svg>;
}

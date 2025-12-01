import React, { useMemo, useState } from "react";

/**
 * CaptchaBox – captcha leggero senza dipendenze esterne.
 * In produzione puoi sostituirlo con hCaptcha/Google reCAPTCHA.
 */
export default function CaptchaBox({ onVerify }) {
  // piccola sfida matematica random
  const challenge = useMemo(() => {
    const a = Math.floor(Math.random() * 8) + 2; // 2..9
    const b = Math.floor(Math.random() * 8) + 2;
    const ops = ["+", "-", "*"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const expr = `${a} ${op} ${b}`;
    // eslint-disable-next-line no-new-func
    const result = Function(`return (${expr})`)();
    return { expr, result: String(result) };
  }, []);

  const [answer, setAnswer] = useState("");
  const [ok, setOk] = useState(false);

  function check() {
    const pass = answer.trim() === challenge.result;
    setOk(pass);
    onVerify?.(pass);
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontWeight: 600, fontSize: 14 }}>
        Conferma di non essere un robot
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "monospace" }}>{challenge.expr} =</span>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          inputMode="numeric"
          placeholder="risultato"
          style={{
            width: 110,
            height: 36,
            borderRadius: 8,
            border: "1px solid #e6e6ea",
            padding: "0 10px",
          }}
        />
        <button
          type="button"
          onClick={check}
          className="btn-primary"
          style={{ height: 36, padding: "0 12px" }}
        >
          Verifica
        </button>
        {ok && (
          <span style={{ color: "green", fontSize: 13, marginLeft: 4 }}>
            ✓ verificato
          </span>
        )}
      </div>
    </div>
  );
}
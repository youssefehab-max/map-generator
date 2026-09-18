import { NodeDraft } from "../pages/CreateBuilding";

export interface NavStep {
  text: string;
  distanceMeter: number;
  icon: "straight" | "turn-left" | "turn-right" | "elevator" | "stairs" | "finish";
  floorName?: string;
}

// دالة لحساب الاتجاه بين 3 نقط
function getTurnDirection(p1: NodeDraft, p2: NodeDraft, p3: NodeDraft): "left" | "right" | "straight" {
  // حساب المتجهات
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  // الضرب الاتجاهي 2D لتحديد اتجاه الدوران (Cross Product)
  const crossProduct = v1.x * v2.y - v1.y * v2.x;

  // زاوية الانحراف
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  const angle = Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI);

  if (angle < 25) return "straight"; // انحراف بسيط يعتبر مواصلة للأمام
  return crossProduct > 0 ? "right" : "left";
}

// الدالة الرئيسية لتوليد التعليمات
export function generateNavigationSteps(pathNodes: NodeDraft[], scaleFactor: number = 0.05): NavStep[] {
  if (!pathNodes || pathNodes.length < 2) return [];

  const steps: NavStep[] = [];

  // الخطوة الأولى: البداية
  steps.push({
    text: `ابتدئ التحرك من: ${pathNodes[0].name || "نقطة البداية"}`,
    distanceMeter: 0,
    icon: "straight",
  });

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const curr = pathNodes[i];
    const next = pathNodes[i + 1];

    // حساب المسافة وتحويل الإحداثيات لأمتار (باستخدام معيار الرسم scaleFactor)
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    const distMeters = Math.round(distPx * scaleFactor);

    // 1. حالة التغيير بين الطوابق (مصعد / سلم)
    if (curr.floorId !== next.floorId) {
      if (next.type === "elevator" || curr.type === "elevator") {
        steps.push({
          text: `استخدم المصعد للانتقال إلى الطابق التالي`,
          distanceMeter: 0,
          icon: "elevator",
        });
      } else {
        steps.push({
          text: `استخدم السلم للانتقال إلى الطابق التالي`,
          distanceMeter: 0,
          icon: "stairs",
        });
      }
      continue;
    }

    // 2. التوجيه بناءً على الحركة القادمة
    if (i < pathNodes.length - 2) {
      const future = pathNodes[i + 2];
      
      // إذا كانت النقطة القادمة في طابق مختلف تتأجل للشرط السابق
      if (next.floorId === future.floorId) {
        const turn = getTurnDirection(curr, next, future);

        if (turn === "right") {
          steps.push({
            text: `امشِ ${distMeters} متراً، ثم اتجه يميناً عند ${next.name || "النقطة التالية"}`,
            distanceMeter: distMeters,
            icon: "turn-right",
          });
        } else if (turn === "left") {
          steps.push({
            text: `امشِ ${distMeters} متراً، ثم اتجه يساراً عند ${next.name || "النقطة التالية"}`,
            distanceMeter: distMeters,
            icon: "turn-left",
          });
        } else {
          steps.push({
            text: `واصِل السير للأمام مسافة ${distMeters} متراً نحو ${next.name || "النقطة التالية"}`,
            distanceMeter: distMeters,
            icon: "straight",
          });
        }
      }
    } else {
      // الخطوة الأخيرة قبل الوصول
      steps.push({
        text: `امشِ ${distMeters} متراً للوصول إلى وجهتك: ${next.name}`,
        distanceMeter: distMeters,
        icon: "finish",
      });
    }
  }

  return steps;
}
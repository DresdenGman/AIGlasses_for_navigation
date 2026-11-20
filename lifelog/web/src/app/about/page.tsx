import { getUi } from "@/lib/request";
import { t } from "@/lib/i18n";

export default async function AboutPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const paragraphs = locale === "zh-CN"
    ? [
        "Lifelog 是一个实验性的研究原型。它不提供导航，也不是医疗或认证辅助设备。",
        "这一年的档案是为了展示终态而准备的占位数据。画面来自图版槽：以后的季节照片只要放进同一份登记，就会出现在对应的帧上。",
        "回答只引用记录里真实存在的时间。低于置信下限的内容带着不确定标记。没有引用的内容不会出现。记录里没有的事，会写成「记录中未找到」。",
        "暂停是页眉上的一个按钮。暂停的时间在时间轴上是斜线，而不是猜测。本地优先打开时，云端模型和云盘备份关闭，家用 NAS 仍可备份。",
        "字可以放大。画面有说明。时间轴可以用键盘移动：左右一帧，Shift 加左右五分钟，J 与 K 换段落，斜线键去询问，P 暂停。",
      ]
    : [
        "Lifelog is an experimental research prototype. It does not guide navigation, and it is not a medical device or a certified aid.",
        "The year is a placeholder archive of the end state. Frames point at image slots, so later seasonal photographs appear by being added to the same registry.",
        "Answers cite only moments that are in the record. Items under the confidence floor wear an uncertain mark. Anything without a citation is left out. If it is not in the record, the page says so.",
        "Pause is a button in the header. Paused time is a hatched gap on the timeline, not a guess. While local-first is on, cloud models and cloud-drive backup stay off. A home NAS backup can still run.",
        "Type can grow. Pictures have descriptions. The day moves from the keyboard: arrows for a frame, shift plus arrows for five minutes, J and K for a stretch, slash for Ask, P to pause.",
      ];
  return (
    <article className="mx-auto max-w-page px-6 py-10">
      <h1 className="serif text-display">{copy.aboutTitle}</h1>
      <div className="mt-8 max-w-measure space-y-5 text-lg">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

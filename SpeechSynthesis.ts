enum ENpron {
    //% block="ALPHABET"
    ALPHABET,
    //% block="WORD"
    WORD
}

enum SoundType {
    //% block="MALE1"
    MALE1,
    //% block="MALE2"
    MALE2,
    //% block="FEMALE1"
    FEMALE1,
    //% block="FEMALE2"
    FEMALE2,
    //% block="FEMALE3"
    FEMALE3,
    //% block="DONALDDUCK"
    DONALDDUCK
}

enum DigitalPron {
    NUMBER,/**<Telephone number>*/
    NUMERIC,/**<Number>*/
    AUTOJUDGED,/**<Auto Judge>*/
}

enum SpeechStyle {
    CATON,/**<Word by word>*/
    SMOOTH,/**<Fluently>*/
}

enum Language {
    CHINESEL,/**<Chinese>*/
    ENGLISHL,/**<English>*/
    AUTOJUDGEL,/**<Auto Judge>*/
}

enum ZeroPron {
    ZREO,
    OU
}

enum NamePron {
    NAME,
    AUTOJUDGEDN
}

enum OnePron {
    YAO,
    CHONE
}

enum Pinyin {
    PINYIN_ENABLE,
    PINYIN_DISABLE,
}


class SubMess {
    ischar: number;
    index: number;
    length: number;
    constructor(ischar: number, index: number, length: number) {
        this.ischar = ischar;
        this.index = index;
        this.length = length;
    }
}



//% weight=100 color=#0fbc11 icon="\uf0b2"
namespace SpeechSynthesis {

    let I2C_ADDR = 0x40;  //i2c address
    let INQUIRYSTATUS = 0x21;
    let ENTERSAVEELETRI = 0x88;
    let WAKEUP = 0xFF;

    let START_SYNTHESIS = 0x01;
    let START_SYNTHESIS1 = 0x02;
    let STOP_SYNTHESIS = 0x02;
    let PAUSE_SYNTHESIS = 0x03;
    let RECOVER_SYNTHESIS = 0x04;

    // State
    let CHINESE = 0;
    let ENGLISH = 1;
    let NONE = 2;

    let _len = 0;
    let __index = 0;
    let uniLen = 0;
    let _index = 0;
    let _unicode: number[] = [];
    let _utf8: number[] = [];

    let curState = NONE;
    let lastState = NONE;

    let lanChange = false;
    let _isFlash = false;

    //% block="speech synthesis module I2C mode init" 
    //% weight=40
    export function begin(): void {
        // Add code here
        let init = 0xAA;
        sendCommand1([init], 1);
        basic.pause(50);
        speakElish("[n1]");
        setVolume(5);
        setSpeed(5);
        setTone(5);
        setSoundType(SoundType.FEMALE1);
        setEnglishPron(ENpron.WORD);
    }


    //% block="speech synthesis %data"
    //% weight=30
    export function speak(data: string): void {

        let mess: SubMess;
        let uni: number = 0;
        let _data: Buffer = control.createBufferFromUTF8(data);
        let dat2 = _data.toArray(NumberFormat.UInt8LE)
        let len = dat2.length;
        __index = 0;

        while (__index < len) {
            _isFlash = false;
            mess = getSubMess(dat2);
            if (mess.ischar === 2) {
                let sendData: number[] = [0xfd, (mess.length + 2) >> 8, (mess.length + 2) & 0xff, 0x01, 0x03];
                sendCommand1(sendData, 5);
                for (let i = 0; i < mess.index;) {
                    let utf8 = dat2[__index + i];
                    if (utf8 >= 0xe0) {
                        uni = utf8 & 15;
                        i++;
                        utf8 = dat2[__index + i];
                        uni <<= 6;
                        uni |= (utf8 & 0x03f);
                        i++;
                        utf8 = dat2[__index + i];
                        uni <<= 6;
                        uni |= (utf8 & 0x03f);

                        sendData[0] = uni & 0xff;
                        sendData[1] = uni >> 8;
                        sendCommand1(sendData, 2);
                        i++;
                    } else if (utf8 >= 0xc0) {
                        uni = utf8 & 0x1f;
                        i++;
                        utf8 = dat2[__index + i];
                        uni <<= 6;
                        uni |= (utf8 & 0x03f);
                        i++;
                        sendData[0] = uni & 0xff;
                        sendData[1] = uni >> 8;
                        sendCommand1(sendData, 2);
                    }
                }
            }

            if (mess.ischar === 1) {
                let sendData = [0xfd, (mess.length + 2) >> 8, (mess.length + 2) & 0xff, 0x01, 0x00];
                sendCommand1(sendData, 5);
                for (let i = 0; i < mess.index;) {
                    let utf8 = dat2[__index + i];
                    sendData[0] = utf8 & 0x7f;
                    sendCommand1(sendData, 1);
                    i++;
                }
            }
            if (mess.length == 0) break;
            // wait();
            serial.writeLine("__index" + __index)
            __index += mess.index;
        }
    }

    //% block="set volume %music speed %speak tone %tone speaker %pronounce"
    //% music.min=0 music.max=10 music.defl=8
    //% speak.min=0 speak.max=10 speak.defl=5
    //% tone.min=0 tone.max=10 tone.defl=5
    //% weight=20
    export function setPara(music: number, speak: number, tone: number, pronounce: SoundType): void {
        setVolume(music);
        setSpeed(speak);
        setSoundType(pronounce);
        setTone(tone);
    }

    //% block="set English pronounce mode %pron"
    //% weight=10
    export function setPronunciation(pron: ENpron): void {
        setEnglishPron(pron);
    }

    function setVolume(voc: number): void {
        if (voc > 9) {
            voc = 9;
        }
        speakElish("[v" + String.fromCharCode(48 + voc) + "]"); //"[v5]"
    }

    function setSpeed(speed: number): void {
        if (speed > 9) {
            speed = 9;
        }
        speakElish("[s" + String.fromCharCode(48 + speed) + "]"); //"[s5]"
    }
    function setTone(tone: number): void {
        if (tone > 9) {
            tone = 9;
        }
        speakElish("[t" + String.fromCharCode(48 + tone) + "]"); //"[t5]"
    }
    function setSoundType(type: SoundType): void {
        let str = "";
        if (type == SoundType.FEMALE1) {
            str = "[m3]";
        } else if (type == SoundType.MALE1) {
            str = "[m51]";
        } else if (type == SoundType.MALE2) {
            str = "[m52]";
        } else if (type == SoundType.FEMALE2) {
            str = "[m53]";
        } else if (type == SoundType.DONALDDUCK) {
            str = "[m54]";
        } else if (type == SoundType.FEMALE3) {
            str = "[m55]";
        }
        speakElish(str);
    }
    function setEnglishPron(pron: ENpron): void {
        let str = "";
        if (pron == ENpron.ALPHABET) {
            str = "[h1]";
        } else if (pron == ENpron.WORD) {
            str = "[h2]";
        }
        speakElish(str);
    }

    function setDigitalPron(pron: DigitalPron): void {
        let str = "";
        if (pron == DigitalPron.NUMBER) {
            str = "[n1]";
        } else if (pron == DigitalPron.NUMERIC) {
            str = "[n2]";
        } else if (pron == DigitalPron.AUTOJUDGED) {
            str = "[n0]";
        }
        speakElish(str);
    }

    function setSpeechStyle(style: SpeechStyle): void {
        let str = "";
        if (style == SpeechStyle.CATON) {
            str = "[f0]";
        } else if (style == SpeechStyle.SMOOTH) {
            str = "[f1]";
        }
        speakElish(str);
    }

    function enablePINYIN(enable: boolean): void {
        let str = "";
        if (enable == true) {
            str = "[i1]";
        } else if (enable == false) {
            str = "[i0]";
        }
        speakElish(str);
    }

    function setLanguage(style: Language): void {
        let str = "";
        if (style == Language.CHINESEL) {
            str = "[g1]";
        } else if (style == Language.ENGLISHL) {
            str = "[g2]";
        } else if (style == Language.AUTOJUDGEL) {
            str = "[g0]";
        }
        speakElish(str);
    }

    function setZeroPron(pron: ZeroPron): void {
        let str = "";
        if (pron == ZeroPron.ZREO) {
            str = "[o0]";
        } else if (pron == ZeroPron.OU) {
            str = "[o1]";
        }
        speakElish(str);
    }

    function setOnePron(pron: OnePron): void {
        let str = "";
        if (pron == OnePron.YAO) {
            str = "[y0]";
        } else if (pron == OnePron.CHONE) {
            str = "[y1]";
        }
        speakElish(str);
    }

    function setNamePron(pron: NamePron): void {
        let str = "";
        if (pron == NamePron.NAME) {
            str = "[r1]";
        } else if (pron == NamePron.AUTOJUDGEDN) {
            str = "[r0]";
        }
        speakElish(str);
    }

    function enableRhythm(enable: boolean): void {
        let str = "";
        if (enable == true) {
            str = "[z1]";
        } else if (enable == false) {
            str = "[z0]";
        }
        speakElish(str);
    }
    function reset(pron: ENpron): void {
        speakElish("[d]");
    }




    function sendCommand1(data: number[], length: number): void {
        let cmd = pins.createBufferFromArray(data.slice(0, length));
        pins.i2cWriteBuffer(I2C_ADDR, cmd, false);
        //150us延时
    }

    function sendCommand2(head: number[], data: number[], length: number): void {

        let lenTemp = 0;
        let point = 0;
        pins.i2cWriteBuffer(I2C_ADDR, pins.createBufferFromArray(head), false);

        while (length) {
            if (length > 28) {
                lenTemp = 28;
            }
            else {
                lenTemp = length;
            }

            pins.i2cWriteBuffer(I2C_ADDR, pins.createBufferFromArray(data.slice(point, lenTemp)), false);
            length -= lenTemp;
            point += lenTemp;
        }
    }

    function sendPack(cmd: number, data: number[], len: number): void {
        let head = [0xfd, 0, 0, 0, 0];
        let length = 0;
        switch (cmd) {
            case START_SYNTHESIS: {
                length = 2 + len;
                head[1] = length >> 8;
                head[2] = length & 0xff;
                head[3] = START_SYNTHESIS;
                head[4] = 0x03;
                sendCommand2(head, data, len);
            } break;
            case START_SYNTHESIS1: {
                length = 2 + len;
                head[1] = length >> 8;
                head[2] = length & 0xff;
                head[3] = START_SYNTHESIS;
                head[4] = 0x00;
                sendCommand2(head, data, len);
            } break;
            default: {
                length = 1;
                head[1] = length >> 8;
                head[2] = length & 0xff;
                head[3] = cmd;
                sendCommand1(head, 4);
            } break;

        }
    }

    function readACK(): number {
        basic.pause(20);
        let data: Buffer = pins.i2cReadBuffer(I2C_ADDR, 2)
        basic.pause(10);
        let data1 = data[0];
        let data2 = data[1];
        if (data1 == 0x4f || data2 == 0x4F)
            return 0x4f;
        else
            return data1;
    }

    function wait(): void {
        basic.pause(20);
        while (readACK() != 0x4F) { }//等待语音播放完成
    }

    function speakElish(word: string): void {

        _len = word.length;
        for (let i = 0; i < _len; i++) {
            _unicode.push(word.charCodeAt(i) & 0x7f);
        }
        sendPack(START_SYNTHESIS1, _unicode, _len);

        wait();

        _len = 0;
        _unicode = [];
    }

    function getSubMess(dat: number[]): SubMess {
        let mess: SubMess = new SubMess(0, 0, 0);
        let frist: boolean = false;
        let ischar: number = 0;
        let index: number = 0;
        let length: number = 0;

        if (_isFlash == true) {

        } else {
            _len = dat.length;
        }

        while (index < _len) {
            let utf8 = 0;
            if (_isFlash == true) {

            } else {
                utf8 = dat[index + __index];
            }
            if (utf8 >= 0xfc) {
                index += 6;
                length += 4;
            } else if (utf8 >= 0xf8) {
                index += 5;
                length += 3;
            } else if (utf8 >= 0xf0) {
                index += 4;
                length += 3;
            } else if (utf8 >= 0xe0) {
                if (ischar == 1) {
                    break;
                }
                index += 3;
                length += 2;
                if (frist == false) {
                    ischar = 2;
                    frist = true;
                }
            } else if (utf8 >= 0xc0) {
                if (ischar == 1) {
                    break;
                }
                index += 2;
                length += 2;
                if (frist == false) {
                    ischar = 2;
                    frist = true;
                }
            } else if (utf8 <= 0x80) {
                if (utf8 == 0) break;
                if (ischar == 2) {
                    break;
                }

                index += 1;
                length++;

                if (frist == false) {
                    ischar = 1;
                    frist = true;
                }
            }
        }
        mess.ischar = ischar;
        mess.length = length;
        mess.index = index;
        return mess;
    }
}

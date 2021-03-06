(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    exports = module.exports = factory();
  } else {
    root.PlanCalendar = factory();
  }
})(this ? this : window, function () {
  class PlanCalendar {
    constructor(el, options) {
      // 默认值
      const defaults = {
        monthNum: 4, // Number 默认值 4，月份显示个数
        startByData: false, // Boolean 根据传入数据的最小日期指定第一个月的显示
        showExpiredData: false, // Boolean 默认值 false，是否渲染今天以前的数据; 当showExpiredData值为true时，startByData 设置true将失效
        minPriceText: '无团期', // String, 默认值 无团期， 当月最小价格为0 时显示文字
        sellOutText: '售罄', // String 默认值 '售罄'，余位为0时显示文字
        maxNum: 20, // Number  默认值 20，大于等于指定余位显示 maxNumText 的值
        maxNumText: '充足', // String  默认值 '充足'，配置大于等于指定余位显示文字
        defineNumText: '', // String 默认值： '', 自定义数量显示，若设置，权重最高，maxNumText 会失效
        markDates: [], // Array  默认值 []， 格式化好的团期数据
        disableDates: [], // 禁选团期，只禁用含团的日期，Array 指定日期 | Object 时间范围，start/end，
        onSelect: function (data) {
          // 选择团期之后的回调, data[Array]: 团期数据
        },
        onMouseEnter: function (data) {
          // 鼠标移入含团日期回调， data[Array]: 团期数据，ps：必须为当月，上月或下月将不触发
        },
        onMouseLeave: function () {
          // 鼠标离开当月日期项之后的回调
        },
        onYearChange: function () {
        },
        onMonthChange: function (data) {
          // 切换月之后的回调，data[Array]： 当月所有的团期数据
        }
      };

      this.$el = isNodeElement(el) ? el : document.querySelector(el);
      this.$options = mapAssignObj(defaults, options); // 初始化参数
      this.$data = this.optimizeData();
      // 当showExpiredData值为true时，startByData 设置true将失效
      this.$options.startByData =
        this.$options.startByData && !this.$options.showExpiredData;
      this.$startDate =
        this.$data.length > 0 ? this.$data[0].date : format(new Date()); // 第一个含数据的日期
      this.$seletedDate = ''; // 已选日期
      // 标准化数据中的日期 yyyy-mm-dd
      this.initCalendar();
    }
    // 优化传入数据
    optimizeData() {
      const time = new Date();
      const startTime = new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate()
      ).getTime();
      const markDates = this.$options.markDates.reduce((prevVal, curVal) => {
        curVal.date = format(new Date(curVal.date));
        prevVal.push(curVal);
        return prevVal;
      }, []);
      const sortDates = markDates.sort((min, max) => {
        return new Date(min.date).getTime() - new Date(max.date).getTime();
      });
      return this.$options.showExpiredData
        ? sortDates
        : sortDates.filter(curVal => {
          // 过滤今天以前的数据
          return startTime <= new Date(curVal.date).getTime();
        });
    }
    initCalendar() {
      const options = this.$options;

      let year = options.startByData
        ? +this.$startDate.split('/')[0]
        : new Date().getFullYear();
      let month = options.startByData
        ? +this.$startDate.split('/')[1] - 1
        : new Date().getMonth();
      let monthActiveIndex = 0;

      const $header = this.createElem(
        'div',
        'calendar-header',
        this.getCalHeaderHtml(year, month)
      );
      this.createElem('ul', 'calendar-week', this.getCalWeek());
      const $date = this.createElem(
        'ul',
        'calendar-date',
        this.getCalDateHtml(year, month)
      );

      const $year = $header.querySelector('.calendar-header-year')
      const $month = $header.querySelector('.calendar-header-month')

      this.on('click', $year, '.btn-prev', (parent, targetNode) => {
        year = parseInt($year.querySelector('.text').textContent);
        $year.querySelector('.text').textContent = `${--year}年`
        $date.innerHTML = this.getCalDateHtml(year, month);
        options.onYearChange(year, month);
      })
      this.on('click', $year, '.btn-next', (parent, targetNode) => {
        year = parseInt($year.querySelector('.text').textContent);
        $year.querySelector('.text').textContent = `${++year}年`
        $date.innerHTML = this.getCalDateHtml(year, month);
        options.onYearChange(year, month);
      })
      this.on('click', $month, '.btn-prev', (parent, targetNode) => {
        year = parseInt($year.querySelector('.text').textContent);
        month = parseInt($month.querySelector('.text').textContent) - 1;
        year = month === 0 ? --year : year;
        month = month === 0 ? 11 : --month;
        $year.querySelector('.text').textContent = `${year}年`
        $month.querySelector('.text').textContent = `${month + 1}月`
        $date.innerHTML = this.getCalDateHtml(year, month);
        options.onMonthChange(year, month);
      })
      this.on('click', $month, '.btn-next', (parent, targetNode) => {
        year = parseInt($year.querySelector('.text').textContent);
        month = parseInt($month.querySelector('.text').textContent) - 1;
        year = month === 11 ? ++year : year;
        month = month === 11 ? 0 : ++month;
        $year.querySelector('.text').textContent = `${year}年`
        $month.querySelector('.text').textContent = `${month + 1}月`
        $date.innerHTML = this.getCalDateHtml(year, month);
        options.onMonthChange(year, month);
      })

      // 选择含团日期
      this.on('click', $date, '.enabled', (parent, targetNode) => {
        // 移除所有元素样式类.selected
        parent.childNodes.forEach(curVal => removeClass(curVal, 'selected'));
        addClass(targetNode, 'selected');
        this.$seletedDate = targetNode.getAttribute('data-date');
        options.onSelect(this.getPlanDateData(this.$seletedDate));
        if (targetNode.className.includes('prev')) {
          $month.querySelector('.btn-prev').click();
        }
        if (targetNode.className.includes('next')) {
          $month.querySelector('.btn-next').click();
        }
      });
      // 鼠标移入含团日期
      this.on('mouseover', $date, '.enabled', (parent, targetNode, related) => {
        const curDate = targetNode.getAttribute('data-date');
        if (
          related !== targetNode &&
          !targetNode.contains(related) &&
          (targetNode.className.trim() === 'enabled' ||
            targetNode.className.includes('selected'))
        ) {
          options.onMouseEnter(this.getPlanDateData(curDate));
        }
      });
      // 鼠标移出含团日期
      this.on('mouseout', $date, '.enabled', (parent, targetNode, related) => {
        if (
          related !== targetNode &&
          !targetNode.contains(related) &&
          (targetNode.className.trim() === 'enabled' ||
            targetNode.className.includes('selected'))
        ) {
          options.onMouseLeave();
        }
      });
    }
    // 事件委托
    on(eventType, elem, childSelector, callback) {
      const _this = this;
      elem.addEventListener(eventType, function (event) {
        const target = event.target || event.srcElement;
        const targetNode = getTargetNode(target, this, childSelector);
        const related = event.relatedTarget;

        if (targetNode) {
          callback && callback(this, targetNode, related);
        }
      });
    }
    createElem(tag, cls, html) {
      const elem = document.createElement(tag);
      elem.className = cls;
      elem.innerHTML = html;
      this.$el.append(elem);
      return elem;
    }
    getPlanDate(year, month, date) {
      const options = this.$options;
      const uniqueData = this.getUniqueData();

      // 返回团期对应
      for (let i = 0; i < uniqueData.length; i++) {
        if (format(new Date(year, month, date)) === uniqueData[i].date) {
          let badge =
            this.getPlanDateData(year, month, date).length > 1
              ? '<i class="badge">多团</i>'
              : uniqueData[i].number === 0
                ? `<i class="badge">${options.sellOutText}</i>`
                : '';
          return `${badge}
            <p class="price">&yen;${uniqueData[i].price}起</p>
            <p class="number">${this.toNumText(uniqueData[i].number)}</p>`;
        }
      }
    }
    // 获取去重后的数据对象，默认返回含对象的数组，当type = date 时返回['2018/08/25,2018/08/21']
    getUniqueData(type) {
      const dates = []; // 过滤团期使用的中间数组
      // 获取日期去重数据
      const uniqueData = this.$data
        .sort((min, max) => {
          return min.price - max.price;
        })
        .reduce((prevArr, curVal) => {
          if (dates.indexOf(curVal.date) === -1) {
            prevArr.push(curVal);
            dates.push(curVal.date);
          }
          return prevArr;
        }, []);

      return type === 'date' ? dates : uniqueData;
    }
    // 获取指定日期团期数据，返回值数组
    getPlanDateData(...dates) {
      const curDate =
        dates.length === 1
          ? format(new Date(dates[0]))
          : format(new Date(dates[0], dates[1], dates[2]));

      return this.$data
        .filter(curVal => {
          return curVal.date === curDate;
        })
        .sort((min, max) => {
          return min.price - max.price;
        });
    }
    getCalDateData(year, month) {
      const febDays =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28; // 平年和闰年二月份天数
      const monthDays = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const startDateIndex = new Date(year, month, 1).getDay();
      const endDateIndex = startDateIndex + (monthDays[month] - 1);
      const getCurDate = ((num = 0) => () => ++num)(); // 累加计数器
      const calDateData = [];
      for (let i = 0; i < 42; i++) {
        if (i < startDateIndex) {
          // 获取上月数据
          // 处理跨年, 月变11，年减1
          let prevMonth = month === 0 ? 11 : month - 1;
          let prevYear = month === 0 ? year - 1 : year;
          let d = monthDays[prevMonth] - (startDateIndex - 1 - i);
          let curDate = format(new Date(prevYear, prevMonth, d));
          calDateData.push({ date: curDate, status: 'prev' });
        } else if (i >= startDateIndex && i <= endDateIndex) {
          // 获取当月数据
          let d = i - startDateIndex + 1;
          let curDate = format(new Date(year, month, d));
          calDateData.push({ date: curDate, status: 'current' });
        } else {
          // 获取下月数据
          // 处理跨年，月变0，年加1
          let nextMonth = month === 11 ? 0 : month + 1;
          let nextYear = month === 11 ? year + 1 : year;
          let curDate = format(new Date(nextYear, nextMonth, getCurDate()));
          calDateData.push({ date: curDate, status: 'next' });
        }
      }

      return calDateData;
    }
    getCalDateHtml(year, month) {
      let t = new Date();
      let html = '';

      const options = this.$options;
      const calDateData = this.getCalDateData(year, month);
      const uniqueData = this.getUniqueData('date');

      for (let i = 0; i < calDateData.length; i++) {
        if (calDateData[i].status === 'prev') {
          html += this.getPlanDateHtml(calDateData[i].date, 'prev');
        } else if (calDateData[i].status === 'current') {
          html += this.getPlanDateHtml(calDateData[i].date, 'current');
        } else if (calDateData[i].status === 'next') {
          html += this.getPlanDateHtml(calDateData[i].date, 'next');
        }
      }
      return html;
    }
    getPlanDateHtml(dateString, type) {
      const uniqueData = this.getUniqueData('date');
      const year = +dateString.split('/')[0];
      const month = +dateString.split('/')[1] - 1;
      const date = +dateString.split('/')[2];
      const week = new Date(dateString).getDay();
      const dateText = this.isToday(year, month, date);
      const disabledClass = this.isDisabled(dateString)
        ? 'disabled'
        : 'enabled';
      const selectClass = this.$seletedDate === dateString ? 'selected' : '';
      const invalidClass = type !== 'current' ? `invalid ${type}` : '';
      const todayClass = dateText === '今天' ? 'today' : '';

      if (uniqueData.indexOf(dateString) !== -1) {
        return `<li class="${disabledClass} ${selectClass} ${invalidClass} ${todayClass}" data-date="${dateString}" data-week="${week}">
            <p class="date">${dateText}</p>
            ${this.getPlanDate(year, month, date)}
          </li>`;
      }
      return `<li class="${invalidClass} ${todayClass}" data-date="${dateString}" data-week="${week}"><p class="date">${dateText}</p></li>`;
    }
    getCalHeaderHtml(year, month) {
      return `<div class="calendar-header-year">
                <span class="btn-prev">&lt;</span>
                <span class="text">${year}年</span>
                <span class="btn-next">&gt;</span>
              </div>
              <div class="calendar-header-month">
                <span class="btn-prev">&lt;</span>
                <span class="text">${month + 1}月</span>
                <span class="btn-next">&gt;</span>
              </div>`
    }
    getCalWeek() {
      const weekCn = ['日', '一', '二', '三', '四', '五', '六'];
      let html = '';

      for (let i = 0; i < weekCn.length; i++) {
        html += `<li>${weekCn[i]}</li>`;
      }
      return html;
    }
    toNumText(num) {
      const options = this.$options;
      if (options.defineNumText) {
        return options.defineNumText;
      } else if (num >= options.maxNum) {
        return options.maxNumText;
      } else {
        return '余：' + num;
      }
      // return num < options.maxNum ? '余：' + num : options.maxNumText;
    }
    isDisabled(date) {
      const disableDates = this.$options.disableDates;

      if (getType(disableDates) === 'array') {
        if (disableDates.length === 0) return false;
        const dates = disableDates.map(curVal => format(curVal));
        return dates.indexOf(date) === -1 ? false : true;
      } else {
        const dateTime = new Date(date).getTime();

        const start = disableDates.start
          ? new Date(format(disableDates.start)).getTime()
          : new Date().getTime();
        const end = disableDates.end
          ? new Date(format(disableDates.end)).getTime()
          : new Date().getTime();
        if (end - start <= 0) {
          console.warn('disableDates的start日期不能大于end日期');
          return false;
        } else {
          return dateTime >= start && dateTime <= end ? true : false;
        }
      }
    }
    // 获取数组中的最低价
    getMinPrice(year, month, date) {
      // 获取指定日期最低价格
      if (date) return this.getPlanDateData(year, month, date)[0];
      // 获取指定月最低价格
      if (this.$data.length === 0) return this.$options.minPriceText;
      // 根据年月日过滤数据
      const filterData = this.$data.filter(curVal => {
        return (
          +curVal.date.split('/')[0] === year &&
          +curVal.date.split('/')[1] === month + 1
        );
      });
      // 返回已过滤数组中的最小价格
      return filterData.length !== 0
        ? filterData
          .map(curVal => {
            return curVal.price;
          })
          .sort((min, max) => {
            return min - max;
          })[0]
        : this.$options.minPriceText;
    }
    getStart(type) {
      const time = new Date();
      const startTime = new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate()
      ).getTime();
      if (this.$options.startByData) {
      }
    }
    isToday(year, month, date) {
      const t = new Date();
      return new Date(year, month, date).getTime() ===
        new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
        ? '今天'
        : date;
    }
  }
  // 数字小于10追加 0
  function appendZero(num) {
    return num >= 10 ? num : '0' + num;
  }
  // 格式化日期, date 日期对象|时间戳|日期字符串，rule 结果日期格式如yyyy-mm-dd
  function format(date, rule) {
    const d = getType(date) === 'date' ? date : new Date(date);
    const r = rule ? rule : 'yyyy/mm/dd';
    const yyyy = d.getFullYear();
    const mm = appendZero(d.getMonth() + 1);
    const dd = appendZero(d.getDate());
    const seps = r.match(/[-/\s年月日]/g);

    return `${yyyy}${seps[0]}${mm}${seps[1]}${dd}${seps[2] ? seps[2] : ''}`;
  }
  // 判断是否为元素节点
  function isNodeElement(node) {
    return node.nodeType === 1;
  }
  // 获取数据类型
  function getType(obj) {
    const obj2Str = Object.prototype.toString;
    if (obj2Str.call(obj) === '[object Array]') {
      return 'array';
    } else if (obj2Str.call(obj) === '[object Object]') {
      return 'object';
    } else if (obj2Str.call(obj) === '[object Date]') {
      return 'date';
    }
  }
  // 遍历赋值对象, obj1 默认对象，obj2 赋值对象
  function mapAssignObj(obj1, obj2) {
    for (let i in obj1) {
      if (typeof obj2[i] === 'undefined') {
        obj2[i] = obj1[i];
      } else if (getType(obj2[i]) === 'object') {
        mapAssignObj(obj1[i], obj2[i]);
      }
    }
    return obj2;
  }
  function hasClass(el, cls) {
    return el.className.includes(cls);
  }
  function addClass(el, cls) {
    if (!hasClass(el, cls)) {
      el.className += ' ' + cls;
    }
  }
  function removeClass(el, cls) {
    if (hasClass(el, cls)) {
      const re = new RegExp(`(\\s|^)${cls}`);
      el.className = el.className.replace(re, '');
    }
  }
  function getTargetNode(node, parent, selector) {
    if (node.parentNode.nodeName === 'BODY') return null;
    if (node.parentNode === parent) {
      if (
        node.nodeName.toLowerCase() === selector ||
        node.className.includes(selector.substring(1)) ||
        node.id.includes(selector.substring(1))
      ) {
        return node;
      }
      return null;
    }
    return node.parentNode !== parent
      ? getTargetNode(node.parentNode, parent, selector)
      : null;
  }

  return PlanCalendar;
});

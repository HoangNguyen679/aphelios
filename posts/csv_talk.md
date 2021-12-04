---
title: 'CSV talk in Ruby'
date: '2021-12-02'
---

I am not good at coding, so every time working with `csv`, I get so many troubles. After all, I decide to make a note about `csv` file by using ruby. And I think it is not bad to mention `csv` working with some other programming language. Let's begin!

# CSV Overview

CSV - Comma-Separated Values

[Wikipedia](https://en.wikipedia.org/wiki/Comma-separated_values)

- text file
- each line is a data record
- each data record has one or more fields
- each data record has the same number of fields, in the same order
- each data record terminated by newlines (CRLF)
- separate by semicolon `,`
- MIME: `'text/csv'`

Actually, separator can be tab `\t` or something else. At that time, we have delimiter-separated format, but we can still use `.csv` as file format.

Specification can be found at [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180). However, actual practice often does not follow the RFC. We can pass through the RFC with useful settings on CSV library.

## Example

```csv
id,name,age
1,David,30
2,Helen,27
```

## Basic rules

- Data within fields is interpreted as a sequence of characters, not as a sequence of bits or bytes

### Quoting

- Any field may be quoted, while some fields must be quoted.
  - Fields with embedded commas or double-quote characters must be quoted.
  ```csv
  1,Ford,E350,"Super, luxurious truck"
  ```
  - Each of the embedded double-quote characters must be represented by a pair of double-quote characters
  ```csv
  1,Ford,E350,"Super, ""luxurious"" truck"
  ```
  - Fields with embedded line breaks must be quoted
  ```csv
  1,Ford,E350,"Go get one now
  they are going fast"
  ```

### BOM (Byte order mark)

When working with Japanese, we need to take attention to BOM when parse CSV file.

[Wikipedia](https://en.wikipedia.org/wiki/Byte_order_mark)

- a magic number at the start of a text stream can signal several things to a program reading the text (LoL)
- need to handle when using mix up excel to open csv with japanese document (UTF-8: 0xEF,0xBB,0xBF)


# Ruby CSV

[CSV Lib](https://docs.ruby-lang.org/ja/latest/class/CSV.html)
[CSV Github](https://github.com/ruby/csv)

Every fields read is string!

```ruby
require 'csv'

users =<<-EOS
id,name,age
1,David,30
2,Helen,27
EOS

File.write("test.csv", users)

File.open("test.csv", "r") do |f|
  csv = CSV.new(f, headers: true)
  csv.class # => CSV
  csv.first # => #<CSV::Row "id":"1" "name":"David" "age":"30">
end
```

Specify separator

```ruby
require "csv"

users =<<-EOS
id|name|age
1|David|30
2|Helen|27
EOS

csv = CSV.new(users, { headers: true, col_sep: "|" })
p csv.class # => CSV
p csv.first # => #<CSV::Row "id":"1" "name":"David" "age":"30">
```

## Read CSV

```ruby
require 'csv'

users =<<-EOS
id,name,age
1,David,30
2,Helen,27
EOS

File.write("test.csv", users)

p CSV.read("test.csv", headers: true)
# 1,David,30
# 2,Helen,27

csv = CSV.read("test.csv", headers: true)
csv.each do |row|
  p row[0]    # 1,2
  p row['id'] # 1,2
  p row[csv.headers[0]] # 1,2
end
```


## Loop through CSV

```ruby
require "csv"

users =<<-EOS
id,name,age
1,David,30
2,Helen,27
EOS

File.write("test.csv", users)

CSV.foreach("test.csv", headers: true) do |row|
  p row
end

# => ["1", "David", "30"]
# => ["2", "Helen", "20"]
```

## Quote fields CSV

When facing `CSV::MalformedCSVError: Illegal quoting in line x.` try `{liberal_parsing: true}`

```ruby
require "csv"

users =<<-EOS
id,name
1,"David
lala"
2,"Helen
lyly"
EOS

File.write("test.csv", users)

CSV.foreach("test.csv", headers: true, liberal_parsing:true) do |row|
  p row
end

# 1,"David
# lala"
# 2,"Helen
# lyly"
```

## Write CSV

### Object

```ruby
require "csv"

users =<<-EOS
id,name,age
1,David,30
2,Helen,27
EOS

csv_string = CSV.generate(users, headers: true) do |csv|
  csv << ["3", "Merlin", "28"]
end
print csv_string
# id,name,age
# 1,David,30
# 2,Helen,27
# 3,Merlin,28
```

### File

```ruby
require "csv"

users =<<-EOS
id,name,age
1,David,30
2,Helen,27
EOS

CSV.open("test.csv", "wb") do |csv|
  csv << ["1", "David", "30"]
  csv << ["2", "Helen", "27"]
end

print File.read("test.csv")
# id,name,age
# 1,David,30
# 2,Helen,27
```

## BOM Handle

```ruby
require 'csv'
require 'tempfile'

t = Tempfile.new("file.csv")
csv = CSV.parse(File.read(t, encoding: 'bom|utf-8'), headers: true)
```

In test

```ruby
BOM = "\xEF\xBB\xBF"
expect(CSV.parse(response.body.delete_prefix(BOM))).to eq [['value']]
```

If you want to work with excel, check [Roo](https://github.com/roo-rb/roo)

# CSV Rust

Today, I am interested in Rust, so let try something.
I am so surprize that the csv doc of rust is so beautiful. That makes me easy to use lib and save my time.

[CSV Doc](https://docs.rs/csv/latest/csv/)
[CSV Github](https://github.com/BurntSushi/rust-csv)

```rust
use std::env;
use std::error::Error;
use std::ffi::OsString;
use std::fs::File;
use std::process;

fn main() {
    if let Err(err) = run() {
        println!("{}", err);
        process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let file_path = get_first_arg()?;
    let file = File::open(file_path)?;
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .delimiter(b'\t')
        .from_reader(file);
    for result in reader.records() {
        let record = result?;
        println!("{:?}", record);
    }
    Ok(())
}

fn get_first_arg() -> Result<OsString, Box<dyn Error>> {
    match env::args_os().nth(1) {
        None => Err(From::from("expected 1 argument, but got none")),
        Some(file_path) => Ok(file_path)
    }
}
```

This is fucking good! As I see, it quite fast.
I will benchmark the speed of reading csv in the next time.

(To be continue...)


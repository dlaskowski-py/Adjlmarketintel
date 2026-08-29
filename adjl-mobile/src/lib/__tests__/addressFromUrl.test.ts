import { addressFromUrl, detectSource, formatAddress } from "../addressFromUrl";

describe("detectSource", () => {
  it("identifies supported listing sites", () => {
    expect(detectSource("https://www.zillow.com/homedetails/x/1_zpid/")).toBe("zillow");
    expect(detectSource("https://www.redfin.com/TX/Austin/x/home/1")).toBe("redfin");
    expect(detectSource("https://www.realtor.com/realestateandhomes-detail/x")).toBe("realtor");
  });

  it("returns null for unsupported hosts and junk input", () => {
    expect(detectSource("https://www.trulia.com/p/tx/austin/1234-main-st")).toBeNull();
    expect(detectSource("not a url")).toBeNull();
    expect(detectSource("")).toBeNull();
  });
});

describe("addressFromUrl — Zillow", () => {
  it("parses a standard homedetails URL", () => {
    expect(
      addressFromUrl("https://www.zillow.com/homedetails/1234-Main-St-Austin-TX-78701/29465729_zpid/")
    ).toEqual({ street: "1234 Main St", city: "Austin", state: "TX", zip: "78701" });
  });

  it("handles multi-word cities", () => {
    expect(
      addressFromUrl(
        "https://www.zillow.com/homedetails/8215-Broadway-Ave-San-Antonio-TX-78209/12345678_zpid/"
      )
    ).toEqual({ street: "8215 Broadway Ave", city: "San Antonio", state: "TX", zip: "78209" });
  });

  it("keeps unit designators with the street", () => {
    expect(
      addressFromUrl(
        "https://www.zillow.com/homedetails/500-W-26th-St-APT-4B-Austin-TX-78705/98765432_zpid/"
      )
    ).toEqual({ street: "500 W 26th St Apt 4B", city: "Austin", state: "TX", zip: "78705" });
  });

  it("parses the /homes/..._rb search-result form", () => {
    expect(
      addressFromUrl("https://www.zillow.com/homes/2100-Barton-Springs-Rd-Austin-TX-78704_rb/")
    ).toEqual({ street: "2100 Barton Springs Rd", city: "Austin", state: "TX", zip: "78704" });
  });

  it("tolerates ZIP+4, query strings and a missing protocol", () => {
    expect(
      addressFromUrl("www.zillow.com/homedetails/1234-Main-St-Austin-TX-78701-1234/29465729_zpid/?foo=1")
    ).toEqual({ street: "1234 Main St", city: "Austin", state: "TX", zip: "78701" });
  });

  it("returns null when the slug has no recognizable street suffix", () => {
    // Ambiguous: cannot tell where street ends and city begins → manual entry.
    expect(
      addressFromUrl("https://www.zillow.com/homedetails/1234-Broadway-Austin-TX-78701/1_zpid/")
    ).toBeNull();
  });

  it("returns null for non-listing Zillow pages", () => {
    expect(addressFromUrl("https://www.zillow.com/austin-tx/")).toBeNull();
    expect(addressFromUrl("https://www.zillow.com/")).toBeNull();
  });
});

describe("addressFromUrl — Redfin", () => {
  it("parses a standard home URL", () => {
    expect(
      addressFromUrl("https://www.redfin.com/TX/Austin/1234-Main-St-78701/home/12345678")
    ).toEqual({ street: "1234 Main St", city: "Austin", state: "TX", zip: "78701" });
  });

  it("expands hyphenated city names", () => {
    expect(
      addressFromUrl("https://www.redfin.com/TX/San-Antonio/8215-Broadway-Ave-78209/home/44556677")
    ).toEqual({ street: "8215 Broadway Ave", city: "San Antonio", state: "TX", zip: "78209" });
  });

  it("folds a unit segment into the street", () => {
    expect(
      addressFromUrl("https://www.redfin.com/TX/Austin/1234-Main-St-78701/unit-5/home/12345678")
    ).toEqual({ street: "1234 Main St Unit 5", city: "Austin", state: "TX", zip: "78701" });
  });

  it("parses street names with no suffix (city is explicit in the path)", () => {
    expect(
      addressFromUrl("https://www.redfin.com/NY/New-York/350-Broadway-10013/home/99887766")
    ).toEqual({ street: "350 Broadway", city: "New York", state: "NY", zip: "10013" });
  });

  it("returns null for search pages", () => {
    expect(addressFromUrl("https://www.redfin.com/city/30818/TX/Austin")).toBeNull();
    expect(addressFromUrl("https://www.redfin.com/zipcode/78701")).toBeNull();
  });
});

describe("addressFromUrl — Realtor.com", () => {
  it("parses the underscore-delimited detail slug", () => {
    expect(
      addressFromUrl(
        "https://www.realtor.com/realestateandhomes-detail/1234-Main-St_Austin_TX_78701_M12345-67890"
      )
    ).toEqual({ street: "1234 Main St", city: "Austin", state: "TX", zip: "78701" });
  });

  it("parses a slug without a trailing property id", () => {
    expect(
      addressFromUrl("https://www.realtor.com/realestateandhomes-detail/8215-Broadway-Ave_San-Antonio_TX_78209")
    ).toEqual({ street: "8215 Broadway Ave", city: "San Antonio", state: "TX", zip: "78209" });
  });

  it("returns null when the slug carries no address", () => {
    expect(
      addressFromUrl("https://www.realtor.com/realestateandhomes-detail/M1234-56789")
    ).toBeNull();
  });
});

describe("addressFromUrl — failure modes fall back to manual entry", () => {
  it.each([
    ["empty string", ""],
    ["whitespace", "   "],
    ["not a url", "1234 Main St, Austin TX"],
    ["unsupported site", "https://www.trulia.com/p/tx/austin/1234-main-st-austin-tx-78701"],
    ["bad state code", "https://www.zillow.com/homedetails/1234-Main-St-Austin-ZZ-78701/1_zpid/"],
    ["bad zip", "https://www.zillow.com/homedetails/1234-Main-St-Austin-TX-7870/1_zpid/"],
  ])("returns null for %s", (_label, url) => {
    expect(addressFromUrl(url)).toBeNull();
  });
});

describe("formatAddress", () => {
  it("renders a single-line address", () => {
    expect(
      formatAddress({ street: "1234 Main St", city: "Austin", state: "TX", zip: "78701" })
    ).toBe("1234 Main St, Austin, TX 78701");
  });
});

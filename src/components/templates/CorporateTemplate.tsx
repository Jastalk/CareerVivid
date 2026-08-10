
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { inkOn, readableAccent } from '../../utils/templateInk';

export const CorporateTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };
  /*
   * Was a per-template copy of a YIQ brightness test with a 0.5 threshold. That
   * is not a contrast measurement: on `#718096` it chose white, at 3.5:1.
   * `inkOn` measures the real ratio and reaches for true black when near-black
   * is not enough.
   */
  const headerTextColor = inkOn(themeColor);

  return (
    <div className="bg-white text-gray-800" style={bodyStyle}>
      <header className="p-8" style={{ backgroundColor: themeColor, color: headerTextColor }}>
        <div className="flex gap-3 items-end">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-4xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-4xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-xl font-light mt-1 block" 
            tagName="h2"
            placeholder="Job Title"
        />
      </header>

      <div className="p-8 grid grid-cols-12 gap-8">
        <aside className="col-span-4 border-r pr-8">
          <section className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Contact</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                  <Mail size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
                  <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
              </div>
              <div className="flex items-center">
                  <Phone size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
                  <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
              </div>
              <div className="flex items-center">
                  <MapPin size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
                  <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
              </div>
              {websites.map((site, index) => (
                <div key={site.id} className="flex items-center">
                  <Globe size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Education</h3>
            {education.map((edu, index) => (
              <div key={edu.id} className="mb-4">
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-md font-semibold block" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Degree"
                />
                <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="text-sm block" 
                    tagName="p"
                    placeholder="School"
                />
                <div className="flex gap-1 text-xs text-gray-600">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span key={skill.id} className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded" style={{ backgroundColor: `${themeColor}20`, color: readableAccent(themeColor) }}>
                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                </span>
              ))}
            </div>
          </section>
        </aside>

        <main className="col-span-8">
          <section className="mb-6">
            <h3 className="text-lg font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Profile</h3>
            <InlineEdit 
                value={professionalSummary} 
                fieldId="professionalSummary" 
                onFocus={onFocus} 
                className="text-sm leading-relaxed block whitespace-pre-wrap"
                tagName="p"
                placeholder="Professional Summary..."
            />
          </section>

          <section>
            <h3 className="text-lg font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Experience</h3>
            {employmentHistory.map((job, index) => (
              <div key={job.id} className="mb-5">
                <div className="flex justify-between items-baseline">
                  <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-semibold block" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Job Title"
                  />
                  <div className="flex gap-1 text-sm text-gray-600">
                      <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
                </div>
                <div className="flex gap-1 text-md font-medium text-gray-700">
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                    <span>,</span>
                    <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                </div>
                <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    className="text-sm mt-2 leading-relaxed whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                />
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};
